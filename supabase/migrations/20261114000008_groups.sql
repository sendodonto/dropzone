-- DROPZONE · 0008 · Groups.
-- A Free Fire room holds ~12 squads, so bigger tournaments split confirmed teams into groups (A, B, ...).
-- Each "queda" then exists once per group, its room is visible only to that group, and results are
-- entered per group. Standings keep summing every match, so the overall table needs no change.

alter table public.tournament_registrations add column if not exists group_label text check (group_label ~ '^[A-H]$');
alter table public.matches add column if not exists group_label text check (group_label ~ '^[A-H]$');
alter table public.matches add column if not exists round integer check (round between 1 and 20);
update public.matches set round = number where round is null;

-- Randomly splits confirmed teams into p_groups balanced groups and rebuilds the match list:
-- one match per (round, group), groups of the same round scheduled at the same time.
create or replace function public.configure_groups(p_tournament uuid, p_groups int)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tournaments; g int; q int; maps text[];
begin
  perform public.assert_active();
  if not public.can_manage_tournament(p_tournament) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if t.status in ('finished', 'cancelled', 'draft') then raise exception 'Os grupos só podem ser definidos com o campeonato publicado e não encerrado.'; end if;
  if p_groups < 1 or p_groups > 8 then raise exception 'Use de 1 a 8 grupos.'; end if;
  if t.matches_count * p_groups > 20 then raise exception 'Quedas × grupos não pode passar de 20 partidas.'; end if;
  if exists (select 1 from public.match_results r join public.matches m on m.id = r.match_id where m.tournament_id = t.id) then
    raise exception 'Já existem resultados lançados: não é possível refazer os grupos.';
  end if;

  update public.tournament_registrations set group_label = null where tournament_id = t.id;
  if p_groups > 1 then
    with shuffled as (
      select id, row_number() over (order by random()) - 1 as rn
      from public.tournament_registrations where tournament_id = t.id and status = 'confirmed'
    )
    update public.tournament_registrations r set group_label = chr(65 + (s.rn % p_groups)::int)
    from shuffled s where r.id = s.id;
  end if;

  -- keep the map chosen for each round
  select array_agg(map order by r) into maps from (
    select distinct on (coalesce(round, number)) coalesce(round, number) r, map from public.matches where tournament_id = t.id order by coalesce(round, number), number
  ) x;
  delete from public.matches where tournament_id = t.id; -- no results exist (checked above); rooms go with them
  for q in 1..t.matches_count loop
    for g in 1..p_groups loop
      insert into public.matches(tournament_id, number, round, group_label, map, scheduled_at)
      values (t.id, (q - 1) * p_groups + g, q, case when p_groups > 1 then chr(64 + g) end, coalesce(maps[q], 'Bermuda'),
              t.starts_at + (q - 1) * interval '25 minutes');
    end loop;
  end loop;
  perform public.log_action('tournament.groups', 'tournament', t.id, t.id, jsonb_build_object('groups', p_groups));
end $$;

-- Moves one confirmed team to another group (manual adjustment after the draw).
create or replace function public.set_registration_group(p_registration uuid, p_group text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.tournament_registrations;
begin
  perform public.assert_active();
  select * into r from public.tournament_registrations where id = p_registration;
  if r.id is null or not public.can_manage_tournament(r.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  if p_group is not null and not exists (select 1 from public.matches where tournament_id = r.tournament_id and group_label = p_group) then
    raise exception 'Esse grupo não existe neste campeonato.';
  end if;
  update public.tournament_registrations set group_label = p_group where id = r.id;
  perform public.log_action('registration.group', 'registration', r.id, r.tournament_id, jsonb_build_object('group', p_group));
end $$;

-- Rooms of a group match are visible only to that group's teams.
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
      and (m.group_label is null or r.group_label = m.group_label)
      and public.is_registration_member(r.id)
      and case mr.audience
            when 'all_participants' then r.status in ('pending', 'confirmed')
            when 'confirmed' then r.status = 'confirmed'
            else r.status = 'confirmed' and exists (
              select 1 from public.match_room_targets x where x.match_id = p_match and x.registration_id = r.id)
          end
  );
$$;

-- Results of a group match only accept that group's teams; placements go up to the group size.
create or replace function public.save_match_results(p_match uuid, p_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.matches; t public.tournaments; teams int;
begin
  perform public.assert_active();
  select * into m from public.matches where id = p_match for update;
  if m.id is null or not public.can_manage_tournament(m.tournament_id) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'live' then raise exception 'Resultados só podem ser lançados com o campeonato em andamento.'; end if;
  select count(*) into teams from public.tournament_registrations
    where tournament_id = t.id and status = 'confirmed' and (m.group_label is null or group_label = m.group_label);
  if exists (select 1 from jsonb_to_recordset(p_rows) x(placement int) where x.placement < 1 or x.placement > teams) then
    raise exception 'Colocação fora do intervalo 1–%.', teams;
  end if;
  if m.group_label is not null and exists (
    select 1 from jsonb_to_recordset(p_rows) x(registration_id uuid)
    where not exists (select 1 from public.tournament_registrations r where r.id = x.registration_id and r.group_label = m.group_label)
  ) then
    raise exception 'Há equipes de outro grupo nesta queda.';
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

grant execute on function public.configure_groups(uuid, int), public.set_registration_group(uuid, text) to authenticated;
