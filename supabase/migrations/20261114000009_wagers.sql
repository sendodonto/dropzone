-- DROPZONE · 0009 · Apostados (X1–X4 matches with a stake), mediated by the platform admin.
--
-- The platform never holds or moves money. Each side pays its stake by Pix to the mediator (admin),
-- the mediator confirms both payments, the room is released only to the two sides, both captains report
-- the winner, and the mediator pays the winner out of band. Every step is logged.
-- Safeguards: adults only (every rostered player confirms age 18+), global kill switch `wagers_enabled`.

-- ───────── Age confirmation (only the confirmation is stored, never the birth date) ─────────
alter table public.profiles add column if not exists adult_confirmed_at timestamptz;

create or replace function public.confirm_adult(p_birthdate date)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active();
begin
  if p_birthdate is null or p_birthdate > (current_date - interval '18 years')::date then
    raise exception 'Apostados são só para maiores de 18 anos.';
  end if;
  if p_birthdate < date '1900-01-01' then raise exception 'Data de nascimento inválida.'; end if;
  update public.profiles set adult_confirmed_at = now() where id = v;
  perform public.log_action('profile.adult_confirmed', 'user', v);
end $$;

-- ───────── Settings ─────────
insert into public.platform_settings (key, value, is_public) values
  ('wagers_enabled', 'true', true),
  ('wager_fee_percent', '10', true),
  ('wager_payment_instructions', '""', true)
on conflict (key) do nothing;

-- ───────── Tables ─────────
do $$ begin
  create type public.wager_status as enum ('open', 'accepted', 'paid', 'live', 'disputed', 'finished', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.wagers (
  id uuid primary key default gen_random_uuid(),
  code serial unique,                                   -- short public number (#123)
  team_size integer not null check (team_size between 1 and 4),
  stake_cents integer not null check (stake_cents between 100 and 50000),   -- per player
  fee_percent numeric(5,2) not null check (fee_percent between 0 and 50),
  rounds integer not null default 1 check (rounds in (1, 3, 5)),
  map text not null default 'Bermuda' check (char_length(map) between 2 and 30),
  rules text check (char_length(rules) <= 1000),
  status public.wager_status not null default 'open',
  creator_id uuid not null references public.profiles(id),
  a_team_id uuid references public.teams(id) on delete set null,
  a_players uuid[] not null,
  b_captain_id uuid references public.profiles(id),
  b_team_id uuid references public.teams(id) on delete set null,
  b_players uuid[],
  a_paid_at timestamptz,
  b_paid_at timestamptz,
  a_report text check (a_report in ('a', 'b')),
  b_report text check (b_report in ('a', 'b')),
  winner text check (winner in ('a', 'b')),
  paid_out_at timestamptz,
  resolution text check (char_length(resolution) <= 1000),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  finished_at timestamptz,
  check (array_length(a_players, 1) = team_size),
  check (b_players is null or array_length(b_players, 1) = team_size)
);
create index if not exists wagers_status_idx on public.wagers(status, created_at desc);

-- Room credentials live apart so RLS can hide them from everyone but the two sides and the admin.
create table if not exists public.wager_rooms (
  wager_id uuid primary key references public.wagers(id) on delete cascade,
  room_code text not null check (char_length(room_code) between 1 and 30),
  room_password text check (char_length(room_password) <= 30),
  updated_at timestamptz not null default now()
);

alter table public.wagers enable row level security;
alter table public.wager_rooms enable row level security;

create or replace function public.is_wager_participant(p_wager uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.wagers w where w.id = p_wager
    and (auth.uid() = any(w.a_players) or auth.uid() = any(coalesce(w.b_players, '{}')) or auth.uid() in (w.creator_id, w.b_captain_id)));
$$;

create policy "wagers: public read" on public.wagers for select using (true);
create policy "wager rooms: sides and admin" on public.wager_rooms for select
  using (public.is_admin() or (public.is_wager_participant(wager_id)
    and exists (select 1 from public.wagers w where w.id = wager_id and w.status in ('live', 'disputed', 'finished'))));
grant select on public.wagers to anon, authenticated;
grant select on public.wager_rooms to authenticated;

-- ───────── Helpers ─────────
create or replace function public.wagers_enabled()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((public.setting('wagers_enabled'))::boolean, false);
$$;

-- Validates a roster: me as the only player (X1) or captain of p_team with exactly team_size active,
-- age-confirmed members of that team.
create or replace function public.wager_roster_check(p_team uuid, p_players uuid[], p_size int)
returns void language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid(); bad text;
begin
  if coalesce(array_length(p_players, 1), 0) <> p_size then raise exception 'Escale exatamente % jogador(es).', p_size; end if;
  if (select count(distinct x) from unnest(p_players) x) <> p_size then raise exception 'Um jogador foi escalado duas vezes.'; end if;
  if p_size = 1 then
    if p_players[1] <> v then raise exception 'No X1 o jogador é você.'; end if;
  else
    if p_team is null or not public.is_team_captain(p_team) then raise exception 'Só o capitão do squad pode escalar o time.' using errcode = '42501'; end if;
    if exists (select 1 from unnest(p_players) x where not exists (
      select 1 from public.team_members m join public.profiles p on p.id = m.user_id
      where m.team_id = p_team and m.user_id = x and p.status = 'active')) then
      raise exception 'Todos os escalados precisam ser integrantes ativos do squad.';
    end if;
  end if;
  select coalesce(p.display_name, p.username) into bad from unnest(p_players) x join public.profiles p on p.id = x
    where p.adult_confirmed_at is null limit 1;
  if bad is not null then raise exception '% ainda não confirmou ser maior de 18 anos (Perfil → Confirmar idade).', bad; end if;
end $$;

create or replace function public.notify_wager(p_wager uuid, p_title text, p_body text default null)
returns void language sql security definer set search_path = '' as $$
  select public.notify(u, 'wager', p_title, p_body, '/apostados/' || w.id)
  from public.wagers w, unnest(w.a_players || coalesce(w.b_players, '{}')) u where w.id = p_wager;
$$;

-- ───────── Player actions ─────────
create or replace function public.create_wager(p_team_size int, p_stake_cents int, p_rounds int, p_map text,
  p_rules text, p_team uuid, p_players uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); wid uuid;
begin
  if not public.wagers_enabled() then raise exception 'Apostados estão pausados no momento.'; end if;
  if (select count(*) from public.wagers where creator_id = v and status in ('open', 'accepted')) >= 3 then
    raise exception 'Você já tem 3 apostados em aberto.';
  end if;
  perform public.wager_roster_check(p_team, p_players, p_team_size);
  insert into public.wagers(team_size, stake_cents, fee_percent, rounds, map, rules, creator_id, a_team_id, a_players)
  values (p_team_size, p_stake_cents, coalesce((public.setting('wager_fee_percent'))::numeric, 10), p_rounds, trim(p_map),
          nullif(trim(p_rules), ''), v, case when p_team_size > 1 then p_team end, p_players)
  returning id into wid;
  perform public.log_action('wager.created', 'wager', wid, null, jsonb_build_object('size', p_team_size, 'stake', p_stake_cents));
  return wid;
end $$;

create or replace function public.accept_wager(p_wager uuid, p_team uuid, p_players uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); w public.wagers;
begin
  if not public.wagers_enabled() then raise exception 'Apostados estão pausados no momento.'; end if;
  select * into w from public.wagers where id = p_wager for update;
  if w.id is null then raise exception 'Apostado não encontrado.'; end if;
  if w.status <> 'open' then raise exception 'Esse apostado já foi aceito ou encerrado.'; end if;
  perform public.wager_roster_check(p_team, p_players, w.team_size);
  if p_players && w.a_players or v = w.creator_id then raise exception 'Você não pode aceitar o próprio apostado.'; end if;
  update public.wagers set status = 'accepted', b_captain_id = v, b_team_id = case when w.team_size > 1 then p_team end,
    b_players = p_players, accepted_at = now() where id = w.id;
  perform public.notify_wager(w.id, 'Apostado #' || w.code || ' aceito', 'Façam o Pix do valor para liberar a sala.');
  perform public.log_action('wager.accepted', 'wager', w.id);
end $$;

create or replace function public.cancel_wager(p_wager uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); w public.wagers;
begin
  select * into w from public.wagers where id = p_wager for update;
  if w.id is null then raise exception 'Apostado não encontrado.'; end if;
  if v <> w.creator_id and not public.is_admin() then raise exception 'Só quem criou pode cancelar.' using errcode = '42501'; end if;
  if w.status <> 'open' and not public.is_admin() then
    raise exception 'Depois de aceito, só o mediador pode cancelar (e devolver os pagamentos).';
  end if;
  if w.status in ('finished', 'cancelled') then raise exception 'Esse apostado já foi encerrado.'; end if;
  update public.wagers set status = 'cancelled', finished_at = now() where id = w.id;
  perform public.notify_wager(w.id, 'Apostado #' || w.code || ' cancelado',
    case when w.a_paid_at is not null or w.b_paid_at is not null then 'O mediador devolve os valores pagos.' end);
  perform public.log_action('wager.cancelled', 'wager', w.id);
end $$;

-- Each side's captain reports the winner; matching reports finish it, conflicting ones open a dispute.
create or replace function public.report_wager(p_wager uuid, p_winner text)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); w public.wagers; side text;
begin
  if p_winner not in ('a', 'b') then raise exception 'Resultado inválido.'; end if;
  select * into w from public.wagers where id = p_wager for update;
  if w.id is null then raise exception 'Apostado não encontrado.'; end if;
  side := case when v = w.creator_id then 'a' when v = w.b_captain_id then 'b' end;
  if side is null then raise exception 'Só os capitães informam o resultado.' using errcode = '42501'; end if;
  if w.status <> 'live' then raise exception 'O resultado só pode ser informado com a partida liberada.'; end if;
  if side = 'a' then update public.wagers set a_report = p_winner where id = w.id;
  else update public.wagers set b_report = p_winner where id = w.id; end if;
  select * into w from public.wagers where id = p_wager;
  if w.a_report is not null and w.b_report is not null then
    if w.a_report = w.b_report then
      update public.wagers set status = 'finished', winner = w.a_report, finished_at = now() where id = w.id;
      perform public.notify_wager(w.id, 'Apostado #' || w.code || ' encerrado', 'Resultado confirmado pelos dois lados. O mediador paga o vencedor.');
    else
      update public.wagers set status = 'disputed' where id = w.id;
      perform public.notify_wager(w.id, 'Apostado #' || w.code || ' em disputa', 'Os resultados informados não batem. Mandem prints ao mediador.');
    end if;
  end if;
  perform public.log_action('wager.reported', 'wager', w.id, null, jsonb_build_object('side', side, 'winner', p_winner));
end $$;

-- ───────── Mediator (admin) actions ─────────
create or replace function public.admin_mark_wager_paid(p_wager uuid, p_side text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.wagers;
begin
  perform public.assert_admin();
  select * into w from public.wagers where id = p_wager for update;
  if w.status <> 'accepted' then raise exception 'Só é possível confirmar pagamento de apostado aceito.'; end if;
  if p_side = 'a' then update public.wagers set a_paid_at = now() where id = w.id;
  elsif p_side = 'b' then update public.wagers set b_paid_at = now() where id = w.id;
  else raise exception 'Lado inválido.'; end if;
  select * into w from public.wagers where id = p_wager;
  if w.a_paid_at is not null and w.b_paid_at is not null then
    update public.wagers set status = 'paid' where id = w.id;
    perform public.notify_wager(w.id, 'Apostado #' || w.code || ': pagamentos confirmados', 'A sala será liberada em instantes.');
  end if;
  perform public.log_action('wager.paid', 'wager', w.id, null, jsonb_build_object('side', p_side));
end $$;

-- The mediator or side A's captain releases the room once both sides paid.
create or replace function public.set_wager_room(p_wager uuid, p_code text, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); w public.wagers;
begin
  select * into w from public.wagers where id = p_wager for update;
  if w.id is null then raise exception 'Apostado não encontrado.'; end if;
  if not (public.is_admin() or v = w.creator_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if w.status not in ('paid', 'live') then raise exception 'A sala só é liberada depois dos dois pagamentos.'; end if;
  insert into public.wager_rooms(wager_id, room_code, room_password) values (w.id, trim(p_code), nullif(trim(p_password), ''))
  on conflict (wager_id) do update set room_code = excluded.room_code, room_password = excluded.room_password, updated_at = now();
  update public.wagers set status = 'live' where id = w.id;
  perform public.notify_wager(w.id, 'Apostado #' || w.code || ': sala liberada', 'Veja o ID e a senha na página do apostado.');
  perform public.log_action('wager.room', 'wager', w.id);
end $$;

create or replace function public.admin_resolve_wager(p_wager uuid, p_winner text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.wagers;
begin
  perform public.assert_admin();
  if p_winner not in ('a', 'b') then raise exception 'Escolha o vencedor.'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'Registre o motivo da decisão.'; end if;
  select * into w from public.wagers where id = p_wager for update;
  if w.status not in ('live', 'disputed') then raise exception 'Só apostados em andamento ou em disputa podem ser decididos.'; end if;
  update public.wagers set status = 'finished', winner = p_winner, resolution = trim(p_note), finished_at = now() where id = w.id;
  perform public.notify_wager(w.id, 'Apostado #' || w.code || ' decidido pelo mediador', trim(p_note));
  perform public.log_action('wager.resolved', 'wager', w.id, null, jsonb_build_object('winner', p_winner, 'note', p_note));
end $$;

create or replace function public.admin_mark_wager_payout(p_wager uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.wagers;
begin
  perform public.assert_admin();
  select * into w from public.wagers where id = p_wager for update;
  if w.status <> 'finished' or w.winner is null then raise exception 'O apostado ainda não tem vencedor.'; end if;
  update public.wagers set paid_out_at = now() where id = w.id;
  perform public.notify_wager(w.id, 'Apostado #' || w.code || ': prêmio pago', 'O mediador registrou o pagamento ao vencedor.');
  perform public.log_action('wager.payout', 'wager', w.id);
end $$;

grant execute on function public.confirm_adult(date), public.create_wager(int, int, int, text, text, uuid, uuid[]),
  public.accept_wager(uuid, uuid, uuid[]), public.cancel_wager(uuid), public.report_wager(uuid, text),
  public.admin_mark_wager_paid(uuid, text), public.set_wager_room(uuid, text, text), public.admin_resolve_wager(uuid, text, text),
  public.admin_mark_wager_payout(uuid), public.is_wager_participant(uuid), public.wagers_enabled() to authenticated;
grant execute on function public.wagers_enabled() to anon;
grant usage, select on sequence public.wagers_code_seq to authenticated;
