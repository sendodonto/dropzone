-- DROPZONE · 0002 · Permission helpers, triggers and business RPCs.
-- Every mutating RPC is SECURITY DEFINER with an empty search_path and
-- re-checks the caller's permissions itself; RLS is the second wall.

-- ───────────────────────── Permission helpers ─────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizer_members where organizer_id = p_org and user_id = auth.uid());
$$;

-- Manage = admin, or a member of a non-suspended organizer while the user is active.
create or replace function public.can_manage_organizer(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_active_user() and exists (
      select 1 from public.organizer_members m
      join public.organizers o on o.id = m.organizer_id
      where m.organizer_id = p_org and m.user_id = auth.uid() and o.status <> 'suspended'
    )
  );
$$;

create or replace function public.can_manage_tournament(p_tournament uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_organizer((select organizer_id from public.tournaments where id = p_tournament));
$$;

create or replace function public.can_view_tournament(p_tournament uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = p_tournament and t.status <> 'draft' and not t.hidden_by_admin
  ) or public.can_manage_tournament(p_tournament);
$$;

create or replace function public.is_team_captain(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teams where id = p_team and captain_id = auth.uid());
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = auth.uid());
$$;

-- Caller belongs to this registration (rostered player or team captain).
create or replace function public.is_registration_member(p_registration uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.registration_players where registration_id = p_registration and user_id = auth.uid())
      or exists (select 1 from public.tournament_registrations r join public.teams t on t.id = r.team_id
                 where r.id = p_registration and t.captain_id = auth.uid());
$$;

-- Room credentials visibility. The single source of truth for who sees ID/password.
create or replace function public.can_view_room(p_match uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_manage_tournament((select tournament_id from public.matches where id = p_match))
  or exists (
    select 1
    from public.match_rooms mr
    join public.matches m on m.id = mr.match_id
    join public.tournament_registrations r on r.tournament_id = m.tournament_id
    where mr.match_id = p_match
      and mr.published
      and (mr.opens_at is null or mr.opens_at <= now())
      and m.status <> 'cancelled'
      and public.is_registration_member(r.id)
      and case mr.audience
            when 'all_participants' then r.status in ('pending', 'confirmed')
            when 'confirmed' then r.status = 'confirmed'
            else r.status = 'confirmed' and exists (
              select 1 from public.match_room_targets x where x.match_id = p_match and x.registration_id = r.id)
          end
  );
$$;

create or replace function public.setting(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.platform_settings where key = p_key;
$$;

-- ───────────────────────── Internal utilities ─────────────────────────
create or replace function public.assert_active()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'Faça login para continuar.' using errcode = '28000'; end if;
  if not public.is_active_user() then raise exception 'Sua conta está suspensa ou banida.' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public.log_action(p_action text, p_entity_type text, p_entity_id uuid,
  p_tournament uuid default null, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, tournament_id, data)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_tournament, coalesce(p_data, '{}'));
$$;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
$$;

-- Notify every rostered player + captain of the tournament's active registrations.
create or replace function public.notify_tournament(p_tournament uuid, p_type text, p_title text,
  p_body text default null, p_link text default null, p_confirmed_only boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, type, title, body, link)
  select distinct u.user_id, p_type, p_title, p_body, p_link
  from public.tournament_registrations r
  cross join lateral (
    select rp.user_id from public.registration_players rp where rp.registration_id = r.id
    union select t.captain_id from public.teams t where t.id = r.team_id
  ) u
  where r.tournament_id = p_tournament
    and r.status in ('pending', 'confirmed')
    and (not p_confirmed_only or r.status = 'confirmed');
$$;

create or replace function public.unique_slug(p_table text, p_base text)
returns text language plpgsql security definer set search_path = '' as $$
declare s text := left(nullif(public.slugify(p_base), ''), 60); candidate text; n int := 0; taken boolean;
begin
  if s is null then s := 'item'; end if;
  candidate := s;
  loop
    execute format('select exists(select 1 from public.%I where slug = $1)', p_table) into taken using candidate;
    exit when not taken;
    n := n + 1;
    candidate := s || '-' || n;
  end loop;
  return candidate;
end $$;

-- ───────────────────────── Signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare u text := lower(new.raw_user_meta_data->>'username');
begin
  if u is null or u !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from public.profiles where username = u) then
    u := null; -- chosen during onboarding
  end if;
  insert into public.profiles(id, username, display_name)
  values (new.id, u, left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
                                   nullif(new.raw_user_meta_data->>'name', ''), u, 'Jogador'), 40));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their profile, but never status / demo flags.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status; new.status_reason := old.status_reason; new.is_demo := old.is_demo;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.complete_onboarding(p_username text, p_display_name text, p_ff_id text,
  p_region text, p_mode public.game_mode, p_intent public.user_intent)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); u text := lower(trim(p_username));
begin
  if u !~ '^[a-z0-9_]{3,20}$' then raise exception 'Username inválido: use 3 a 20 letras minúsculas, números ou _.'; end if;
  if exists (select 1 from public.profiles where username = u and id <> v) then
    raise exception 'Esse username já está em uso.' using errcode = '23505';
  end if;
  update public.profiles set username = u, display_name = left(trim(p_display_name), 40),
    ff_id = nullif(trim(p_ff_id), ''), region = p_region, preferred_mode = p_mode, intent = p_intent, onboarded = true
  where id = v;
end $$;

-- ───────────────────────── Organizers ─────────────────────────
create or replace function public.create_organizer(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); oid uuid; needs_approval boolean;
begin
  if exists (select 1 from public.organizers where owner_id = v) then
    raise exception 'Você já possui um perfil de organizador.';
  end if;
  needs_approval := coalesce((public.setting('organizer_requires_approval'))::boolean, false);
  insert into public.organizers(slug, name, description, owner_id, status, plan_id)
  values (public.unique_slug('organizers', p_name), trim(p_name), p_description, v,
          case when needs_approval then 'pending' else 'approved' end::public.organizer_status,
          (select id from public.plans where code = 'FREE'))
  returning id into oid;
  insert into public.organizer_members(organizer_id, user_id, role) values (oid, v, 'owner');
  perform public.log_action('organizer.created', 'organizer', oid, null, jsonb_build_object('name', p_name));
  return oid;
end $$;

-- ───────────────────────── Teams ─────────────────────────
create or replace function public.create_team(p_name text, p_tag text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); tid uuid;
begin
  if (select count(*) from public.teams where captain_id = v) >= 5 then
    raise exception 'Limite de 5 squads como capitão atingido.';
  end if;
  insert into public.teams(slug, name, tag, description, captain_id)
  values (public.unique_slug('teams', p_name), trim(p_name), upper(trim(p_tag)), p_description, v)
  returning id into tid;
  insert into public.team_members(team_id, user_id, role) values (tid, v, 'captain');
  insert into public.team_member_events(team_id, user_id, actor_id, action) values (tid, v, v, 'created');
  return tid;
end $$;

create or replace function public.invite_to_team(p_team uuid, p_username text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); target uuid; iid uuid; tname text;
begin
  if not public.is_team_captain(p_team) then raise exception 'Apenas o capitão pode convidar.' using errcode = '42501'; end if;
  select id into target from public.profiles where username = lower(trim(p_username)) and status = 'active';
  if target is null then raise exception 'Jogador não encontrado.'; end if;
  if exists (select 1 from public.team_members where team_id = p_team and user_id = target) then
    raise exception 'Esse jogador já faz parte do squad.';
  end if;
  if (select count(*) from public.team_members where team_id = p_team) >= 6 then
    raise exception 'O squad já tem o máximo de 6 integrantes.';
  end if;
  insert into public.team_invites(team_id, invited_user_id, invited_by) values (p_team, target, v) returning id into iid;
  select name into tname from public.teams where id = p_team;
  perform public.notify(target, 'invite', 'Convite para squad', 'Você foi convidado para ' || tname || '.', '/painel/squads');
  return iid;
exception when unique_violation then
  raise exception 'Já existe um convite pendente para esse jogador.';
end $$;

create or replace function public.respond_team_invite(p_invite uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); inv public.team_invites;
begin
  select * into inv from public.team_invites where id = p_invite for update;
  if inv.id is null or inv.invited_user_id <> v then raise exception 'Convite não encontrado.'; end if;
  if inv.status <> 'pending' then raise exception 'Esse convite já foi respondido.'; end if;
  update public.team_invites set status = case when p_accept then 'accepted' else 'declined' end::public.invite_status,
    responded_at = now() where id = p_invite;
  if p_accept then
    if (select count(*) from public.team_members where team_id = inv.team_id) >= 6 then
      raise exception 'O squad já está cheio.';
    end if;
    insert into public.team_members(team_id, user_id) values (inv.team_id, v) on conflict do nothing;
    insert into public.team_member_events(team_id, user_id, actor_id, action) values (inv.team_id, v, v, 'joined');
    perform public.notify((select captain_id from public.teams where id = inv.team_id), 'invite',
      'Convite aceito', (select coalesce(display_name, username) from public.profiles where id = v) || ' entrou no squad.', '/painel/squads');
  end if;
end $$;

create or replace function public.cancel_team_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active();
  update public.team_invites set status = 'cancelled', responded_at = now()
  where id = p_invite and status = 'pending' and public.is_team_captain(team_id);
  if not found then raise exception 'Convite não encontrado.'; end if;
end $$;

create or replace function public.remove_team_member(p_team uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active();
begin
  if not public.is_team_captain(p_team) then raise exception 'Apenas o capitão pode remover integrantes.' using errcode = '42501'; end if;
  if p_user = v then raise exception 'Transfira a liderança antes de sair.'; end if;
  delete from public.team_members where team_id = p_team and user_id = p_user;
  if not found then raise exception 'Integrante não encontrado.'; end if;
  insert into public.team_member_events(team_id, user_id, actor_id, action) values (p_team, p_user, v, 'removed');
  perform public.notify(p_user, 'invite', 'Você saiu de um squad', 'O capitão removeu você do squad.', null);
end $$;

create or replace function public.leave_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active();
begin
  if public.is_team_captain(p_team) then raise exception 'Transfira a liderança antes de sair do squad.'; end if;
  delete from public.team_members where team_id = p_team and user_id = v;
  if not found then raise exception 'Você não faz parte desse squad.'; end if;
  insert into public.team_member_events(team_id, user_id, actor_id, action) values (p_team, v, v, 'left');
end $$;

create or replace function public.transfer_team_captaincy(p_team uuid, p_new_captain uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active();
begin
  if not public.is_team_captain(p_team) then raise exception 'Apenas o capitão pode transferir a liderança.' using errcode = '42501'; end if;
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = p_new_captain) then
    raise exception 'O novo capitão precisa ser integrante do squad.';
  end if;
  update public.team_members set role = 'player' where team_id = p_team and user_id = v;
  update public.team_members set role = 'captain' where team_id = p_team and user_id = p_new_captain;
  update public.teams set captain_id = p_new_captain where id = p_team;
  insert into public.team_member_events(team_id, user_id, actor_id, action) values (p_team, p_new_captain, v, 'captain_transferred');
  perform public.notify(p_new_captain, 'invite', 'Você agora é capitão', 'A liderança do squad foi transferida para você.', '/painel/squads');
end $$;

create or replace function public.delete_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active();
  if not public.is_team_captain(p_team) then raise exception 'Apenas o capitão pode excluir o squad.' using errcode = '42501'; end if;
  if exists (select 1 from public.tournament_registrations where team_id = p_team) then
    raise exception 'Squads com histórico de campeonatos não podem ser excluídos.';
  end if;
  delete from public.teams where id = p_team;
end $$;

-- ───────────────────────── Tournaments ─────────────────────────
create or replace function public.tournaments_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.slug := public.unique_slug('tournaments', new.name);
  new.created_by := coalesce(auth.uid(), new.created_by);
  if auth.uid() is not null then -- end users: lifecycle flags only change through RPCs
    new.status := 'draft'; new.payments_enabled := false; new.hidden_by_admin := false; new.featured := false;
    new.paid_request_status := 'none'; new.is_demo := false; new.published_at := null; new.finished_at := null;
  end if;
  if new.visibility = 'private' and new.invite_code is null then
    new.invite_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
  end if;
  return new;
end $$;
create trigger tournaments_before_insert before insert on public.tournaments
  for each row execute function public.tournaments_before_insert();

create or replace function public.tournaments_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tournament_rules(tournament_id) values (new.id) on conflict do nothing;
  insert into public.tournament_scoring(tournament_id) values (new.id) on conflict do nothing;
  perform public.log_action('tournament.created', 'tournament', new.id, new.id, jsonb_build_object('name', new.name));
  return new;
end $$;
create trigger tournaments_after_insert after insert on public.tournaments
  for each row execute function public.tournaments_after_insert();

-- Notify participants when schedule changes; log important edits.
create or replace function public.tournaments_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at and new.status <> 'draft' then
    perform public.notify_tournament(new.id, 'schedule', 'Horário alterado: ' || new.name,
      'O campeonato agora começa em ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || '.',
      '/campeonatos/' || new.slug);
    perform public.log_action('tournament.rescheduled', 'tournament', new.id, new.id,
      jsonb_build_object('from', old.starts_at, 'to', new.starts_at));
  end if;
  return new;
end $$;
create trigger tournaments_after_update after update on public.tournaments
  for each row execute function public.tournaments_after_update();

create or replace function public.publish_tournament(p_tournament uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; org public.organizers; active_count int; lim int;
begin
  perform public.assert_active();
  if not public.can_manage_tournament(p_tournament) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if t.status <> 'draft' then raise exception 'O campeonato já foi publicado.'; end if;
  select * into org from public.organizers where id = t.organizer_id;
  if org.status <> 'approved' then raise exception 'Seu perfil de organizador ainda não foi aprovado.'; end if;
  if t.starts_at <= now() then raise exception 'A data de início precisa estar no futuro.'; end if;
  if t.entry_type = 'paid' and not t.payments_enabled then
    raise exception 'Inscrições pagas exigem habilitação pelo administrador. Solicite a habilitação ou altere para gratuito.';
  end if;
  select count(*) into active_count from public.tournaments
    where organizer_id = t.organizer_id and status in ('registration_open', 'registration_closed', 'live');
  select coalesce(p.max_active_tournaments, 3) into lim from public.plans p where p.id = org.plan_id;
  if active_count >= coalesce(lim, 3) and not org.is_official then
    raise exception 'Limite de % campeonatos ativos do seu plano atingido.', coalesce(lim, 3);
  end if;
  insert into public.matches(tournament_id, number, scheduled_at)
  select t.id, g, t.starts_at + ((g - 1) * interval '25 minutes') from generate_series(1, t.matches_count) g
  on conflict do nothing;
  update public.tournaments set status = 'registration_open', published_at = now() where id = t.id;
  perform public.log_action('tournament.published', 'tournament', t.id, t.id);
end $$;

create or replace function public.set_tournament_status(p_tournament uuid, p_status public.tournament_status, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; allowed boolean;
begin
  perform public.assert_active();
  if not public.can_manage_tournament(p_tournament) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  allowed := case
    when p_status = 'registration_closed' then t.status in ('registration_open')
    when p_status = 'registration_open' then t.status in ('registration_closed')
    when p_status = 'live' then t.status in ('registration_open', 'registration_closed')
    when p_status = 'cancelled' then t.status in ('draft', 'registration_open', 'registration_closed', 'live')
    else false end;
  if not allowed then raise exception 'Transição de status inválida (% → %).', t.status, p_status; end if;
  if p_status = 'cancelled' and coalesce(trim(p_reason), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  if p_status = 'live' and not exists (select 1 from public.tournament_registrations where tournament_id = t.id and status = 'confirmed') then
    raise exception 'Nenhuma equipe confirmada.';
  end if;
  update public.tournaments set status = p_status, cancel_reason = case when p_status = 'cancelled' then p_reason else cancel_reason end
  where id = t.id;
  if p_status = 'live' then
    -- Pending registrations that were never approved are closed out.
    update public.tournament_registrations set status = 'rejected', status_reason = 'Não aprovada antes do início'
    where tournament_id = t.id and status = 'pending';
    delete from public.registration_players rp using public.tournament_registrations r
    where rp.registration_id = r.id and r.tournament_id = t.id and r.status = 'rejected';
  end if;
  if p_status in ('cancelled', 'live', 'registration_closed') then
    perform public.notify_tournament(t.id, 'registration',
      case p_status when 'cancelled' then 'Campeonato cancelado: ' when 'live' then 'Campeonato começou: '
                    else 'Inscrições encerradas: ' end || t.name,
      p_reason, '/campeonatos/' || t.slug);
  end if;
  perform public.log_action('tournament.status', 'tournament', t.id, t.id,
    jsonb_build_object('from', t.status, 'to', p_status, 'reason', p_reason));
end $$;

create or replace function public.request_paid_entry(p_tournament uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active();
  if not public.can_manage_tournament(p_tournament) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  update public.tournaments set paid_request_status = 'requested'
  where id = p_tournament and entry_type = 'paid' and paid_request_status in ('none', 'denied');
  if not found then raise exception 'Somente campeonatos pagos sem solicitação ativa podem pedir habilitação.'; end if;
  perform public.log_action('tournament.paid_requested', 'tournament', p_tournament, p_tournament);
end $$;

-- ───────────────────────── Registrations ─────────────────────────
create or replace function public.register_team(p_tournament uuid, p_team uuid, p_players uuid[],
  p_reserves uuid[] default '{}', p_invite_code text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); t public.tournaments; rid uuid; taken int; everyone uuid[];
  bad uuid; dup_name text;
begin
  select * into t from public.tournaments where id = p_tournament for update; -- serialises capacity checks
  if t.id is null or t.hidden_by_admin then raise exception 'Campeonato não encontrado.'; end if;
  if not public.is_team_captain(p_team) then raise exception 'Apenas o capitão pode inscrever o squad.' using errcode = '42501'; end if;
  if t.status <> 'registration_open' then raise exception 'As inscrições não estão abertas.'; end if;
  if t.registration_opens_at is not null and now() < t.registration_opens_at then raise exception 'As inscrições ainda não abriram.'; end if;
  if t.registration_closes_at is not null and now() > t.registration_closes_at then raise exception 'O prazo de inscrição terminou.'; end if;
  if t.visibility = 'private' and upper(coalesce(p_invite_code, '')) <> t.invite_code then
    raise exception 'Código de convite inválido.';
  end if;
  if t.entry_type = 'paid' then
    raise exception 'Inscrições pagas ainda não estão disponíveis na plataforma.';
  end if;
  p_reserves := coalesce(p_reserves, '{}');
  if coalesce(array_length(p_players, 1), 0) <> t.team_size then
    raise exception 'Selecione exatamente % jogadores titulares.', t.team_size;
  end if;
  if coalesce(array_length(p_reserves, 1), 0) > t.reserves_allowed then
    raise exception 'O regulamento permite no máximo % reserva(s).', t.reserves_allowed;
  end if;
  everyone := p_players || p_reserves;
  if (select count(distinct x) from unnest(everyone) x) <> array_length(everyone, 1) then
    raise exception 'Um jogador foi selecionado duas vezes.';
  end if;
  select x into bad from unnest(everyone) x
  where not exists (select 1 from public.team_members m join public.profiles p on p.id = m.user_id
                    where m.team_id = p_team and m.user_id = x and p.status = 'active') limit 1;
  if bad is not null then raise exception 'Todos os jogadores precisam ser integrantes ativos do squad.'; end if;
  select coalesce(p.display_name, p.username) into dup_name from public.registration_players rp
    join public.profiles p on p.id = rp.user_id
    where rp.tournament_id = t.id and rp.user_id = any(everyone) limit 1;
  if dup_name is not null then raise exception '% já está inscrito neste campeonato por outro squad.', dup_name; end if;
  if exists (select 1 from public.tournament_registrations where tournament_id = t.id and team_id = p_team) then
    raise exception 'Esse squad já está inscrito.';
  end if;
  select count(*) into taken from public.tournament_registrations
    where tournament_id = t.id and status in ('pending', 'confirmed');
  if taken >= t.max_teams then raise exception 'Não há mais vagas.'; end if;

  insert into public.tournament_registrations(tournament_id, team_id, status, registered_by)
  values (t.id, p_team, case when t.requires_approval then 'pending' else 'confirmed' end::public.registration_status, v)
  returning id into rid;
  insert into public.registration_players(registration_id, tournament_id, user_id, is_reserve)
  select rid, t.id, x, false from unnest(p_players) x
  union all select rid, t.id, x, true from unnest(p_reserves) x;

  perform public.notify(x, 'registration',
    case when t.requires_approval then 'Inscrição enviada: ' else 'Inscrição confirmada: ' end || t.name,
    case when t.requires_approval then 'Aguardando aprovação do organizador.' else 'Seu squad está dentro. Boa sorte!' end,
    '/campeonatos/' || t.slug)
  from unnest(everyone) x;
  perform public.log_action('registration.created', 'registration', rid, t.id, jsonb_build_object('team', p_team, 'players', everyone));
  return rid;
exception when unique_violation then
  raise exception 'Um dos jogadores já está inscrito neste campeonato.';
end $$;

create or replace function public.withdraw_registration(p_registration uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.tournament_registrations; t public.tournaments;
begin
  perform public.assert_active();
  select * into r from public.tournament_registrations where id = p_registration for update;
  if r.id is null or not public.is_team_captain(r.team_id) then raise exception 'Inscrição não encontrada.'; end if;
  select * into t from public.tournaments where id = r.tournament_id;
  if t.status not in ('registration_open', 'registration_closed') or r.status not in ('pending', 'confirmed') then
    raise exception 'Não é mais possível cancelar esta inscrição.';
  end if;
  update public.tournament_registrations set status = 'withdrawn' where id = r.id;
  delete from public.registration_players where registration_id = r.id;
  perform public.log_action('registration.withdrawn', 'registration', r.id, r.tournament_id);
end $$;

create or replace function public.review_registration(p_registration uuid, p_status public.registration_status, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.tournament_registrations; t public.tournaments; taken int; roster jsonb;
begin
  perform public.assert_active();
  select * into r from public.tournament_registrations where id = p_registration for update;
  if r.id is null or not public.can_manage_tournament(r.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = r.tournament_id for update;
  if t.status in ('finished', 'cancelled') then raise exception 'Campeonato encerrado.'; end if;
  if p_status = 'confirmed' then
    if r.status <> 'pending' then raise exception 'Apenas inscrições pendentes podem ser aprovadas.'; end if;
    select count(*) into taken from public.tournament_registrations where tournament_id = t.id and status = 'confirmed';
    if taken >= t.max_teams then raise exception 'Não há mais vagas confirmadas.'; end if;
  elsif p_status in ('rejected', 'removed') then
    if coalesce(trim(p_reason), '') = '' then raise exception 'Informe a justificativa.'; end if;
    if r.status not in ('pending', 'confirmed') then raise exception 'Inscrição já inativa.'; end if;
  else
    raise exception 'Status inválido.';
  end if;
  select coalesce(jsonb_agg(user_id), '[]') into roster from public.registration_players where registration_id = r.id;
  perform public.notify(x::uuid, 'registration',
    case p_status when 'confirmed' then 'Inscrição aprovada: ' when 'rejected' then 'Inscrição recusada: ' else 'Squad removido: ' end || t.name,
    p_reason, '/campeonatos/' || t.slug)
  from jsonb_array_elements_text(roster) x;
  update public.tournament_registrations set status = p_status, status_reason = p_reason where id = r.id;
  if p_status <> 'confirmed' then delete from public.registration_players where registration_id = r.id; end if;
  perform public.log_action('registration.' || p_status, 'registration', r.id, t.id,
    jsonb_build_object('reason', p_reason, 'roster', roster));
end $$;

-- ───────────────────────── Matches, rooms, results ─────────────────────────
create or replace function public.matches_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = new.tournament_id;
  if new.scheduled_at is distinct from old.scheduled_at and t.status <> 'draft' then
    perform public.notify_tournament(t.id, 'schedule', 'Queda ' || new.number || ' remarcada',
      t.name || ': nova previsão ' || to_char(new.scheduled_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.',
      '/campeonatos/' || t.slug || '?tab=partidas');
    perform public.log_action('match.rescheduled', 'match', new.id, t.id, jsonb_build_object('from', old.scheduled_at, 'to', new.scheduled_at));
  end if;
  return new;
end $$;
create trigger matches_after_update after update on public.matches
  for each row execute function public.matches_after_update();

create or replace function public.publish_match_room(p_match uuid, p_publish boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches; t public.tournaments; mr public.match_rooms;
begin
  perform public.assert_active();
  select * into m from public.matches where id = p_match;
  if m.id is null or not public.can_manage_tournament(m.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into mr from public.match_rooms where match_id = p_match;
  if mr.match_id is null then raise exception 'Cadastre a sala antes de publicar.'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  update public.match_rooms set published = p_publish, published_at = case when p_publish then now() end where match_id = p_match;
  if p_publish then
    perform public.notify_tournament(t.id, 'room', 'Sala da queda ' || m.number || ' publicada',
      case when mr.opens_at is not null and mr.opens_at > now()
        then 'ID e senha liberados às ' || to_char(mr.opens_at at time zone 'America/Sao_Paulo', 'HH24:MI') || '.'
        else 'ID e senha já disponíveis.' end,
      '/campeonatos/' || t.slug || '?tab=partidas', mr.audience <> 'all_participants');
  end if;
  perform public.log_action(case when p_publish then 'room.published' else 'room.unpublished' end, 'match', m.id, t.id,
    jsonb_build_object('audience', mr.audience));
end $$;

-- Public, credential-free room status (so the UI can say "sala publicada" without leaking ID/password).
create or replace function public.match_room_status(p_tournament uuid)
returns table (match_id uuid, published boolean, opens_at timestamptz, audience public.room_audience)
language sql stable security definer set search_path = '' as $$
  select mr.match_id, mr.published, mr.opens_at, mr.audience
  from public.match_rooms mr join public.matches m on m.id = mr.match_id
  where m.tournament_id = p_tournament and public.can_view_tournament(p_tournament);
$$;

-- Points are always computed here, never trusted from the client.
create or replace function public.match_results_compute()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.matches; s public.tournament_scoring; reg public.tournament_registrations;
begin
  select * into m from public.matches where id = new.match_id;
  select * into reg from public.tournament_registrations where id = new.registration_id;
  if reg.tournament_id is distinct from m.tournament_id then raise exception 'Equipe não pertence a este campeonato.'; end if;
  if reg.status <> 'confirmed' then raise exception 'Apenas equipes confirmadas recebem resultado.'; end if;
  select * into s from public.tournament_scoring where tournament_id = m.tournament_id;
  if abs(new.bonus_points) > coalesce(s.max_bonus, 0) then
    raise exception 'Bônus acima do permitido (máx. %).', coalesce(s.max_bonus, 0);
  end if;
  new.tournament_id := m.tournament_id;
  new.placement_points := coalesce(s.placement_points[new.placement], 0);
  new.kill_points := new.kills * coalesce(s.kill_points, 1);
  new.total_points := new.placement_points + new.kill_points + new.bonus_points;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger match_results_compute before insert or update on public.match_results
  for each row execute function public.match_results_compute();

-- Results history: any change to an already-published match is logged.
create or replace function public.match_results_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.matches; rec record;
begin
  rec := coalesce(new, old);
  select * into m from public.matches where id = rec.match_id;
  if m.results_status = 'published' then
    perform public.log_action('result.' || lower(tg_op), 'match_result', rec.id, m.tournament_id,
      jsonb_build_object('match', m.number, 'old', case when tg_op <> 'INSERT' then to_jsonb(old) end,
                         'new', case when tg_op <> 'DELETE' then to_jsonb(new) end));
  end if;
  return null;
end $$;
create trigger match_results_audit after insert or update or delete on public.match_results
  for each row execute function public.match_results_audit();

-- Replaces a match's whole result sheet atomically. Points are computed by the trigger above.
create or replace function public.save_match_results(p_match uuid, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches; t public.tournaments; teams int;
begin
  perform public.assert_active();
  select * into m from public.matches where id = p_match for update;
  if m.id is null or not public.can_manage_tournament(m.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'live' then raise exception 'Resultados só podem ser lançados com o campeonato em andamento.'; end if;
  select count(*) into teams from public.tournament_registrations where tournament_id = t.id and status = 'confirmed';
  if exists (select 1 from jsonb_to_recordset(p_rows) x(placement int) where x.placement < 1 or x.placement > teams) then
    raise exception 'Colocação fora do intervalo 1–%.', teams;
  end if;
  delete from public.match_results r where r.match_id = p_match
    and r.registration_id not in (select (e->>'registration_id')::uuid from jsonb_array_elements(p_rows) e);
  insert into public.match_results(match_id, registration_id, placement, kills, bonus_points)
  select p_match, x.registration_id, x.placement, x.kills, coalesce(x.bonus_points, 0)
  from jsonb_to_recordset(p_rows) x(registration_id uuid, placement int, kills int, bonus_points int)
  on conflict (match_id, registration_id) do update
    set placement = excluded.placement, kills = excluded.kills, bonus_points = excluded.bonus_points;
  update public.matches set status = 'live' where id = p_match and status = 'scheduled';
end $$;

create or replace function public.publish_match_results(p_match uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches; t public.tournaments; n int;
begin
  perform public.assert_active();
  select * into m from public.matches where id = p_match for update;
  if m.id is null or not public.can_manage_tournament(m.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'live' then raise exception 'Inicie o campeonato antes de publicar resultados.'; end if;
  select count(*) into n from public.match_results where match_id = p_match;
  if n = 0 then raise exception 'Lance os resultados antes de publicar.'; end if;
  update public.matches set results_status = 'published', status = 'finished', results_published_at = now(),
    dispute_deadline = now() + make_interval(mins => t.dispute_window_minutes)
  where id = p_match;
  perform public.notify_tournament(t.id, 'results', 'Resultados da queda ' || m.number,
    t.name || ': classificação atualizada.', '/campeonatos/' || t.slug || '?tab=classificacao', true);
  perform public.log_action('results.published', 'match', m.id, t.id, jsonb_build_object('teams', n));
end $$;

create or replace function public.open_dispute(p_match uuid, p_registration uuid, p_reason text, p_evidence text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := public.assert_active(); m public.matches; did uuid;
begin
  select * into m from public.matches where id = p_match;
  if m.id is null or m.results_status <> 'published' then raise exception 'Resultados ainda não publicados.'; end if;
  if not public.is_registration_member(p_registration) then raise exception 'Você não participa dessa equipe.' using errcode = '42501'; end if;
  if not exists (select 1 from public.tournament_registrations where id = p_registration and tournament_id = m.tournament_id) then
    raise exception 'Equipe não pertence a este campeonato.';
  end if;
  if m.dispute_deadline is null or now() > m.dispute_deadline then raise exception 'O prazo de contestação terminou.'; end if;
  if exists (select 1 from public.disputes where match_id = p_match and registration_id = p_registration and status = 'open') then
    raise exception 'Já existe uma contestação aberta para esta queda.';
  end if;
  insert into public.disputes(match_id, tournament_id, registration_id, opened_by, reason, evidence_urls)
  values (p_match, m.tournament_id, p_registration, v, p_reason, coalesce(p_evidence, '{}')) returning id into did;
  perform public.notify(om.user_id, 'report', 'Nova contestação', 'Queda ' || m.number || ' recebeu uma contestação.', '/organizador')
  from public.organizer_members om join public.tournaments t on t.organizer_id = om.organizer_id where t.id = m.tournament_id;
  perform public.log_action('dispute.opened', 'dispute', did, m.tournament_id);
  return did;
end $$;

create or replace function public.resolve_dispute(p_dispute uuid, p_accept boolean, p_resolution text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.disputes;
begin
  perform public.assert_active();
  select * into d from public.disputes where id = p_dispute for update;
  if d.id is null or not public.can_manage_tournament(d.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if d.status <> 'open' then raise exception 'Contestação já resolvida.'; end if;
  if coalesce(trim(p_resolution), '') = '' then raise exception 'Descreva a decisão.'; end if;
  update public.disputes set status = case when p_accept then 'accepted' else 'rejected' end::public.dispute_status,
    resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now() where id = d.id;
  perform public.notify(d.opened_by, 'report', case when p_accept then 'Contestação aceita' else 'Contestação recusada' end, p_resolution, null);
  perform public.log_action('dispute.resolved', 'dispute', d.id, d.tournament_id, jsonb_build_object('accepted', p_accept, 'resolution', p_resolution));
end $$;

-- ───────────────────────── Standings ─────────────────────────
-- Total points, then the tournament's configured tiebreakers, compared as a numeric array.
create or replace function public.get_tournament_standings(p_tournament uuid, p_include_drafts boolean default false)
returns table (
  rank bigint, registration_id uuid, team_id uuid, team_name text, team_tag text, team_slug text, team_logo text,
  matches_played bigint, total_points numeric, placement_points bigint, kills bigint, wins bigint,
  best_placement integer, last_placement integer
) language sql stable security definer set search_path = '' as $$
  with allowed as (
    select public.can_view_tournament(p_tournament) as view_ok,
           p_include_drafts and public.can_manage_tournament(p_tournament) as drafts_ok
  ),
  res as (
    select mr.*, m.number from public.match_results mr
    join public.matches m on m.id = mr.match_id, allowed a
    where mr.tournament_id = p_tournament and a.view_ok
      and (m.results_status = 'published' or a.drafts_ok)
  ),
  agg as (
    select r.id as registration_id, r.team_id, tm.name, tm.tag, tm.slug, tm.logo_url,
      count(res.id) as matches_played,
      coalesce(sum(res.total_points), 0) as total_points,
      coalesce(sum(res.placement_points), 0)::bigint as placement_points,
      coalesce(sum(res.kills), 0)::bigint as kills,
      count(*) filter (where res.placement = 1) as wins,
      min(res.placement) as best_placement,
      (array_agg(res.placement order by res.number desc))[1] as last_placement
    from public.tournament_registrations r
    join public.teams tm on tm.id = r.team_id
    left join res on res.registration_id = r.id
    where r.tournament_id = p_tournament and r.status = 'confirmed' and (select view_ok from allowed)
    group by r.id, r.team_id, tm.name, tm.tag, tm.slug, tm.logo_url
  ),
  keyed as (
    select agg.*, array(
      select case tb when 'wins' then agg.wins::numeric
                     when 'kills' then agg.kills::numeric
                     when 'placement_points' then agg.placement_points::numeric
                     when 'best_placement' then -coalesce(agg.best_placement, 999)
                     when 'last_match' then -coalesce(agg.last_placement, 999) end
      from unnest(coalesce(s.tiebreakers, '{wins,kills,best_placement,last_match}')) with ordinality u(tb, ord)
      order by ord) as tiekey
    from agg left join public.tournament_scoring s on s.tournament_id = p_tournament
  )
  select rank() over (order by total_points desc, tiekey desc), registration_id, team_id, name, tag, slug, logo_url,
    matches_played, total_points, placement_points, kills, wins, best_placement, last_placement
  from keyed order by 1, name;
$$;

create or replace function public.finalize_tournament(p_tournament uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tournaments;
begin
  perform public.assert_active();
  if not public.can_manage_tournament(p_tournament) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if t.status <> 'live' then raise exception 'Apenas campeonatos em andamento podem ser finalizados.'; end if;
  if exists (select 1 from public.matches where tournament_id = t.id and status <> 'cancelled' and results_status <> 'published') then
    raise exception 'Publique os resultados de todas as quedas antes de finalizar.';
  end if;
  if exists (select 1 from public.disputes where tournament_id = t.id and status = 'open') then
    raise exception 'Resolva as contestações abertas antes de finalizar.';
  end if;
  update public.tournament_registrations r set final_rank = s.rank
  from public.get_tournament_standings(t.id) s where s.registration_id = r.id;
  update public.tournaments set status = 'finished', finished_at = now() where id = t.id;
  perform public.award_tournament_achievements(t.id);
  perform public.notify_tournament(t.id, 'results', 'Resultado final: ' || t.name,
    'A classificação final foi publicada.', '/campeonatos/' || t.slug || '?tab=classificacao', true);
  perform public.log_action('tournament.finalized', 'tournament', t.id, t.id);
end $$;

-- ───────────────────────── Achievements ─────────────────────────
create or replace function public.award_tournament_achievements(p_tournament uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Players on rosters of confirmed teams in this (now finished) tournament.
  create temporary table _players on commit drop as
    select rp.user_id, r.final_rank from public.registration_players rp
    join public.tournament_registrations r on r.id = rp.registration_id
    where r.tournament_id = p_tournament and r.status = 'confirmed';

  insert into public.user_achievements(user_id, achievement_code, tournament_id)
  select user_id, 'first_tournament', p_tournament from pg_temp._players on conflict do nothing;

  insert into public.user_achievements(user_id, achievement_code, tournament_id)
  select user_id, 'first_title', p_tournament from pg_temp._players where final_rank = 1 on conflict do nothing;

  insert into public.user_achievements(user_id, achievement_code, tournament_id)
  select p.user_id, 'ten_tournaments', p_tournament from pg_temp._players p
  where (select count(*) from public.registration_players rp
         join public.tournament_registrations r on r.id = rp.registration_id
         join public.tournaments t on t.id = r.tournament_id
         where rp.user_id = p.user_id and r.status = 'confirmed' and t.status = 'finished') >= 10
  on conflict do nothing;

  insert into public.user_achievements(user_id, achievement_code, tournament_id)
  select p.user_id, 'hundred_kills', p_tournament from pg_temp._players p
  where (select coalesce(sum(ps.kills), 0) from public.match_player_stats ps
         join public.match_results mr on mr.id = ps.match_result_id
         join public.tournaments t on t.id = mr.tournament_id
         where ps.user_id = p.user_id and t.status = 'finished') >= 100
  on conflict do nothing;

  insert into public.notifications(user_id, type, title, body, link)
  select ua.user_id, 'system', 'Conquista desbloqueada: ' || a.name, a.description, '/painel'
  from public.user_achievements ua join public.achievements a on a.code = ua.achievement_code
  where ua.tournament_id = p_tournament and ua.awarded_at = now();
  drop table pg_temp._players;
end $$;

-- ───────────────────────── Notifications ─────────────────────────
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
$$;

create or replace function public.announcements_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = new.tournament_id;
  perform public.notify_tournament(t.id, 'announcement', 'Aviso: ' || new.title, left(new.body, 160), '/campeonatos/' || t.slug);
  perform public.log_action('announcement.posted', 'announcement', new.id, t.id, jsonb_build_object('title', new.title));
  return new;
end $$;
create trigger announcements_after_insert after insert on public.announcements
  for each row execute function public.announcements_after_insert();

-- ───────────────────────── Reports & moderation ─────────────────────────
create or replace function public.reports_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reporter_id := auth.uid(); new.status := 'open'; new.decision := null; new.resolved_by := null; new.resolved_at := null;
  return new;
end $$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

create or replace function public.reports_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, type, title, body, link)
  select user_id, 'report', 'Nova denúncia recebida', left(new.description, 140), '/admin/denuncias'
  from public.user_roles where role = 'admin';
  if new.tournament_id is not null then
    insert into public.notifications(user_id, type, title, body, link)
    select om.user_id, 'report', 'Denúncia em um campeonato seu', left(new.description, 140), '/organizador/denuncias'
    from public.organizer_members om join public.tournaments t on t.organizer_id = om.organizer_id where t.id = new.tournament_id;
  end if;
  return new;
end $$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

create or replace function public.resolve_report(p_report uuid, p_status public.report_status, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  perform public.assert_active();
  select * into r from public.reports where id = p_report for update;
  if r.id is null or not (public.is_admin() or (r.tournament_id is not null and public.can_manage_tournament(r.tournament_id))) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  if p_status in ('resolved', 'dismissed') and coalesce(trim(p_decision), '') = '' then raise exception 'Registre a decisão.'; end if;
  update public.reports set status = p_status, decision = p_decision,
    resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() end,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = r.id;
  perform public.notify(r.reporter_id, 'report', 'Sua denúncia foi atualizada', coalesce(p_decision, 'Em análise.'), null);
  perform public.log_action('report.' || p_status, 'report', r.id, r.tournament_id, jsonb_build_object('decision', p_decision));
end $$;

-- ───────────────────────── Admin ─────────────────────────
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Acesso restrito ao administrador.' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_set_user_status(p_user uuid, p_status public.account_status, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() then raise exception 'Você não pode alterar o próprio status.'; end if;
  if p_status <> 'active' and coalesce(trim(p_reason), '') = '' then raise exception 'Informe o motivo.'; end if;
  update public.profiles set status = p_status, status_reason = p_reason where id = p_user;
  perform public.log_action('user.' || p_status, 'user', p_user, null, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_set_organizer_status(p_org uuid, p_status public.organizer_status, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.organizers;
begin
  perform public.assert_admin();
  update public.organizers set status = p_status, status_reason = p_reason where id = p_org returning * into o;
  if o.id is null then raise exception 'Organizador não encontrado.'; end if;
  perform public.notify(o.owner_id, 'system', case p_status when 'approved' then 'Organizador aprovado'
    when 'suspended' then 'Organizador suspenso' else 'Organizador em análise' end, p_reason, '/organizador');
  perform public.log_action('organizer.' || p_status, 'organizer', p_org, null, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_set_organizer_plan(p_org uuid, p_plan_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.organizers set plan_id = (select id from public.plans where code = p_plan_code) where id = p_org;
  perform public.log_action('organizer.plan', 'organizer', p_org, null, jsonb_build_object('plan', p_plan_code));
end $$;

create or replace function public.admin_moderate_tournament(p_tournament uuid, p_hidden boolean, p_featured boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_hidden and coalesce(trim(p_reason), '') = '' then raise exception 'Informe o motivo para ocultar.'; end if;
  update public.tournaments set hidden_by_admin = p_hidden, hidden_reason = case when p_hidden then p_reason end,
    featured = p_featured where id = p_tournament;
  perform public.log_action('tournament.moderated', 'tournament', p_tournament, p_tournament,
    jsonb_build_object('hidden', p_hidden, 'featured', p_featured, 'reason', p_reason));
end $$;

-- Paid entries stay off until the platform-wide switch exists (legal + provider).
create or replace function public.admin_review_paid_request(p_tournament uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_approve and not coalesce((public.setting('payments_enabled'))::boolean, false) then
    raise exception 'Pagamentos estão desativados na plataforma. Habilite-os em Configurações após validação jurídica e integração com provedor.';
  end if;
  update public.tournaments set paid_request_status = case when p_approve then 'approved' else 'denied' end::public.paid_request_status,
    payments_enabled = p_approve where id = p_tournament and paid_request_status = 'requested';
  if not found then raise exception 'Nenhuma solicitação pendente.'; end if;
  perform public.log_action('tournament.paid_review', 'tournament', p_tournament, p_tournament,
    jsonb_build_object('approved', p_approve, 'note', p_note));
end $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare old jsonb;
begin
  perform public.assert_admin();
  select value into old from public.platform_settings where key = p_key;
  if not found then raise exception 'Configuração desconhecida.'; end if;
  update public.platform_settings set value = p_value, updated_by = auth.uid(), updated_at = now() where key = p_key;
  perform public.log_action('setting.updated', 'setting', null, null, jsonb_build_object('key', p_key, 'from', old, 'to', p_value));
end $$;

create or replace function public.admin_update_plan(p_code text, p_price_cents integer, p_max_active integer, p_max_teams integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  update public.plans set price_cents = p_price_cents, max_active_tournaments = p_max_active, max_teams_per_tournament = p_max_teams
  where code = p_code;
  perform public.log_action('plan.updated', 'plan', null, null,
    jsonb_build_object('code', p_code, 'price', p_price_cents, 'max_active', p_max_active, 'max_teams', p_max_teams));
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_grant boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() and not p_grant then raise exception 'Você não pode remover o próprio acesso.'; end if;
  if p_grant then
    insert into public.user_roles(user_id, role, granted_by) values (p_user, p_role, auth.uid()) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user and role = p_role;
  end if;
  perform public.log_action(case when p_grant then 'role.granted' else 'role.revoked' end, 'user', p_user, null, jsonb_build_object('role', p_role));
end $$;

-- Bootstrap: callable ONLY with the service_role key (scripts/grant-admin.mjs) or from the SQL editor.
create or replace function public.bootstrap_admin(p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'Nenhum usuário com esse email. Crie a conta primeiro.'; end if;
  insert into public.user_roles(user_id, role) values (uid, 'admin') on conflict do nothing;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, data)
  values (null, 'role.bootstrap_admin', 'user', uid, jsonb_build_object('email', p_email));
  return uid;
end $$;

create or replace function public.award_season_champions(p_season uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform public.assert_admin();
  with top as (select team_id from public.get_team_rankings(null, p_season, 1))
  insert into public.user_achievements(user_id, achievement_code)
  select tm.user_id, 'season_champion' from public.team_members tm join top on top.team_id = tm.team_id
  on conflict do nothing;
  get diagnostics n = row_count;
  perform public.log_action('season.champions', 'season', p_season, null, jsonb_build_object('awarded', n));
  return n;
end $$;

-- ───────────────────────── Payments (provider-agnostic) ─────────────────────────
-- Status changes only through here, always with an event row. Organizers cannot confirm.
create or replace function public.record_payment_status(p_payment uuid, p_status public.payment_status, p_source text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payments; is_service boolean := auth.uid() is null; -- service_role key / SQL editor (anon has no EXECUTE)
begin
  if not is_service then perform public.assert_admin(); end if;
  if p_source not in ('provider_webhook', 'admin') then raise exception 'Origem inválida.'; end if;
  if p_source = 'provider_webhook' and not is_service then raise exception 'Webhooks só pelo servidor.'; end if;
  if coalesce(trim(p_note), '') = '' and not is_service then raise exception 'Registre uma observação.'; end if;
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then raise exception 'Pagamento não encontrado.'; end if;
  update public.payments set status = p_status, updated_at = now() where id = p.id;
  insert into public.payment_events(payment_id, from_status, to_status, actor_id, source, note)
  values (p.id, p.status, p_status, auth.uid(), p_source, p_note);
  perform public.log_action('payment.' || p_status, 'payment', p.id, p.tournament_id, jsonb_build_object('from', p.status, 'note', p_note));
end $$;
