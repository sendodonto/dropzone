-- DROPZONE · 0003 · Rankings and statistics.
-- Only VERIFIED results count: published match results of FINISHED, non-hidden tournaments.

create or replace view public.verified_results with (security_invoker = true) as
  select mr.id, mr.match_id, mr.tournament_id, mr.registration_id, r.team_id, mr.placement, mr.kills,
         mr.total_points, t.finished_at, t.season_id, t.organizer_id
  from public.match_results mr
  join public.matches m on m.id = mr.match_id and m.results_status = 'published'
  join public.tournaments t on t.id = mr.tournament_id and t.status = 'finished' and not t.hidden_by_admin
  join public.tournament_registrations r on r.id = mr.registration_id;

create or replace function public.get_team_rankings(p_since timestamptz default null, p_season uuid default null, p_limit int default 50)
returns table (rank bigint, team_id uuid, name text, tag text, slug text, logo_url text, tournaments bigint,
  titles bigint, matches bigint, wins bigint, kills bigint, points numeric, avg_placement numeric)
language sql stable security definer set search_path = '' as $$
  with v as (
    select * from public.verified_results
    where (p_since is null or finished_at >= p_since) and (p_season is null or season_id = p_season)
  ), agg as (
    select v.team_id, count(distinct v.tournament_id) as tournaments, count(*) as matches,
      count(*) filter (where v.placement = 1) as wins, sum(v.kills)::bigint as kills,
      sum(v.total_points) as points, round(avg(v.placement), 1) as avg_placement
    from v group by v.team_id
  ), titles as (
    select r.team_id, count(*) as titles from public.tournament_registrations r
    where r.final_rank = 1 and r.tournament_id in (select distinct tournament_id from v) group by r.team_id
  )
  select rank() over (order by a.points desc, a.wins desc, a.kills desc), a.team_id, t.name, t.tag, t.slug, t.logo_url,
    a.tournaments, coalesce(ti.titles, 0), a.matches, a.wins, a.kills, a.points, a.avg_placement
  from agg a join public.teams t on t.id = a.team_id left join titles ti on ti.team_id = a.team_id
  order by 1 limit greatest(1, least(p_limit, 200));
$$;

create or replace function public.get_player_rankings(p_since timestamptz default null, p_season uuid default null, p_limit int default 50)
returns table (rank bigint, user_id uuid, username text, display_name text, avatar_url text, tournaments bigint,
  matches bigint, wins bigint, kills bigint, team_points numeric, avg_placement numeric)
language sql stable security definer set search_path = '' as $$
  with v as (
    select * from public.verified_results
    where (p_since is null or finished_at >= p_since) and (p_season is null or season_id = p_season)
  ), per_player as (
    select rp.user_id, v.tournament_id, v.id as result_id, v.placement, v.total_points,
      coalesce(ps.kills, 0) as kills
    from v
    join public.registration_players rp on rp.registration_id = v.registration_id and not rp.is_reserve
    left join public.match_player_stats ps on ps.match_result_id = v.id and ps.user_id = rp.user_id
  ), agg as (
    select user_id, count(distinct tournament_id) as tournaments, count(*) as matches,
      count(*) filter (where placement = 1) as wins, sum(kills)::bigint as kills,
      sum(total_points) as team_points, round(avg(placement), 1) as avg_placement
    from per_player group by user_id
  )
  select rank() over (order by a.kills desc, a.wins desc, a.team_points desc), a.user_id, p.username, p.display_name,
    p.avatar_url, a.tournaments, a.matches, a.wins, a.kills, a.team_points, a.avg_placement
  from agg a join public.profiles p on p.id = a.user_id and p.status = 'active'
  order by 1 limit greatest(1, least(p_limit, 200));
$$;

create or replace function public.get_organizer_rankings(p_since timestamptz default null, p_limit int default 20)
returns table (rank bigint, organizer_id uuid, name text, slug text, logo_url text, is_official boolean,
  tournaments bigint, teams_hosted bigint)
language sql stable security definer set search_path = '' as $$
  with t as (
    select t.organizer_id, t.id from public.tournaments t
    where t.status = 'finished' and not t.hidden_by_admin and (p_since is null or t.finished_at >= p_since)
  ), agg as (
    select t.organizer_id, count(distinct t.id) as tournaments, count(r.id) as teams_hosted
    from t left join public.tournament_registrations r on r.tournament_id = t.id and r.status = 'confirmed'
    group by t.organizer_id
  )
  select rank() over (order by a.tournaments desc, a.teams_hosted desc), o.id, o.name, o.slug, o.logo_url, o.is_official,
    a.tournaments, a.teams_hosted
  from agg a join public.organizers o on o.id = a.organizer_id and o.status = 'approved'
  order by 1 limit greatest(1, least(p_limit, 100));
$$;

-- Personal summary for the player dashboard and public profile.
create or replace function public.get_player_summary(p_user uuid)
returns table (tournaments bigint, titles bigint, matches bigint, wins bigint, kills bigint, points numeric,
  avg_placement numeric, ranking_position bigint)
language sql stable security definer set search_path = '' as $$
  with v as (
    select v.*, coalesce(ps.kills, 0) as player_kills from public.verified_results v
    join public.registration_players rp on rp.registration_id = v.registration_id and rp.user_id = p_user
    left join public.match_player_stats ps on ps.match_result_id = v.id and ps.user_id = p_user
  )
  select count(distinct tournament_id),
    (select count(*) from public.tournament_registrations r join public.registration_players rp on rp.registration_id = r.id
       join public.tournaments t on t.id = r.tournament_id
       where rp.user_id = p_user and r.final_rank = 1 and t.status = 'finished'),
    count(*), count(*) filter (where placement = 1), coalesce(sum(player_kills), 0)::bigint,
    coalesce(sum(total_points), 0), round(avg(placement), 1),
    (select pr.rank from public.get_player_rankings(null, null, 200) pr where pr.user_id = p_user)
  from v;
$$;

create or replace function public.get_team_summary(p_team uuid)
returns table (tournaments bigint, titles bigint, matches bigint, wins bigint, kills bigint, points numeric, avg_placement numeric)
language sql stable security definer set search_path = '' as $$
  select count(distinct v.tournament_id),
    (select count(*) from public.tournament_registrations r join public.tournaments t on t.id = r.tournament_id
      where r.team_id = p_team and r.final_rank = 1 and t.status = 'finished'),
    count(*), count(*) filter (where v.placement = 1), coalesce(sum(v.kills), 0)::bigint,
    coalesce(sum(v.total_points), 0), round(avg(v.placement), 1)
  from public.verified_results v where v.team_id = p_team;
$$;

create or replace function public.get_organizer_overview(p_org uuid)
returns table (tournaments bigint, active bigint, confirmed_teams bigint, open_slots bigint,
  pending_results bigint, pending_registrations bigint, open_disputes bigint, open_reports bigint, revenue_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_organizer(p_org) then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  return query
  with t as (select * from public.tournaments where organizer_id = p_org)
  select (select count(*) from t),
    (select count(*) from t where status in ('registration_open', 'registration_closed', 'live')),
    (select count(*) from public.tournament_registrations r join t on t.id = r.tournament_id
       where r.status = 'confirmed' and t.status in ('registration_open', 'registration_closed', 'live')),
    (select coalesce(sum(greatest(t.max_teams - (select count(*) from public.tournament_registrations r
       where r.tournament_id = t.id and r.status in ('pending', 'confirmed')), 0)), 0)::bigint
       from t where t.status = 'registration_open'),
    (select count(*) from public.matches m join t on t.id = m.tournament_id
       where t.status = 'live' and m.results_status <> 'published' and m.status <> 'cancelled'),
    (select count(*) from public.tournament_registrations r join t on t.id = r.tournament_id where r.status = 'pending'),
    (select count(*) from public.disputes d join t on t.id = d.tournament_id where d.status = 'open'),
    (select count(*) from public.reports rp join t on t.id = rp.tournament_id where rp.status in ('open', 'in_review')),
    (select coalesce(sum(p.amount_cents - p.platform_fee_cents), 0)::bigint from public.payments p join t on t.id = p.tournament_id
       where p.status = 'confirmed');
end $$;

create or replace function public.get_platform_stats()
returns table (users bigint, active_players bigint, organizers bigint, published bigint, live bigint, teams bigint,
  registrations bigint, payments_confirmed_cents bigint, open_reports bigint, pending_organizers bigint, paid_requests bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_admin();
  return query select
    (select count(*) from public.profiles),
    (select count(distinct rp.user_id) from public.registration_players rp join public.tournaments t on t.id = rp.tournament_id
       where coalesce(t.finished_at, t.starts_at) > now() - interval '30 days'),
    (select count(*) from public.organizers),
    (select count(*) from public.tournaments where status <> 'draft'),
    (select count(*) from public.tournaments where status = 'live'),
    (select count(*) from public.teams),
    (select count(*) from public.tournament_registrations where status in ('pending', 'confirmed')),
    (select coalesce(sum(amount_cents), 0)::bigint from public.payments where status = 'confirmed'),
    (select count(*) from public.reports where status in ('open', 'in_review')),
    (select count(*) from public.organizers where status = 'pending'),
    (select count(*) from public.tournaments where paid_request_status = 'requested');
end $$;
