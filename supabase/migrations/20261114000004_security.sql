-- DROPZONE · 0004 · Row Level Security, privileges, storage, reference data.
-- Model: deny by default. Reads via RLS; direct writes only where a column
-- grant + policy allows it; everything else goes through RPCs in 0002.

-- ───────────────────────── Privileges ─────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
-- Never readable directly by clients:
revoke select on public.audit_logs, public.payments, public.payment_events, public.refunds,
  public.subscriptions, public.reports, public.disputes, public.notifications, public.team_invites,
  public.user_roles, public.match_rooms, public.match_room_targets, public.platform_settings from anon;

-- Helpers used inside RLS must be executable by every role.
grant execute on function public.is_admin(), public.is_active_user(), public.is_org_member(uuid),
  public.can_manage_organizer(uuid), public.can_manage_tournament(uuid), public.can_view_tournament(uuid),
  public.is_team_captain(uuid), public.is_team_member(uuid), public.is_registration_member(uuid),
  public.can_view_room(uuid), public.slugify(text) to anon, authenticated;

-- Public read RPCs
grant execute on function public.get_tournament_standings(uuid, boolean), public.get_team_rankings(timestamptz, uuid, int),
  public.get_player_rankings(timestamptz, uuid, int), public.get_organizer_rankings(timestamptz, int),
  public.get_player_summary(uuid), public.get_team_summary(uuid), public.match_room_status(uuid) to anon, authenticated;

-- Authenticated RPCs
grant execute on function
  public.complete_onboarding(text, text, text, text, public.game_mode, public.user_intent),
  public.create_organizer(text, text),
  public.create_team(text, text, text), public.invite_to_team(uuid, text), public.respond_team_invite(uuid, boolean),
  public.cancel_team_invite(uuid), public.remove_team_member(uuid, uuid), public.leave_team(uuid),
  public.transfer_team_captaincy(uuid, uuid), public.delete_team(uuid),
  public.publish_tournament(uuid), public.set_tournament_status(uuid, public.tournament_status, text),
  public.request_paid_entry(uuid),
  public.register_team(uuid, uuid, uuid[], uuid[], text), public.withdraw_registration(uuid),
  public.review_registration(uuid, public.registration_status, text),
  public.publish_match_room(uuid, boolean), public.publish_match_results(uuid), public.save_match_results(uuid, jsonb),
  public.open_dispute(uuid, uuid, text, text[]), public.resolve_dispute(uuid, boolean, text),
  public.finalize_tournament(uuid), public.mark_notifications_read(uuid[]),
  public.resolve_report(uuid, public.report_status, text),
  public.get_organizer_overview(uuid), public.get_platform_stats(),
  public.admin_set_user_status(uuid, public.account_status, text),
  public.admin_set_organizer_status(uuid, public.organizer_status, text),
  public.admin_set_organizer_plan(uuid, text),
  public.admin_moderate_tournament(uuid, boolean, boolean, text),
  public.admin_review_paid_request(uuid, boolean, text),
  public.admin_set_setting(text, jsonb), public.admin_update_plan(text, integer, integer, integer),
  public.admin_set_role(uuid, public.app_role, boolean), public.award_season_champions(uuid),
  public.record_payment_status(uuid, public.payment_status, text, text)
to authenticated;

-- Server-only
grant execute on function public.bootstrap_admin(text), public.record_payment_status(uuid, public.payment_status, text, text)
  to service_role;

-- Column-level write grants (RLS decides which rows)
grant update (username, display_name, avatar_url, bio, ff_id, region, preferred_mode, intent) on public.profiles to authenticated;
grant update (name, description, logo_url, contact_url) on public.organizers to authenticated;
grant insert, delete on public.organizer_members to authenticated;
grant update (name, tag, logo_url, description) on public.teams to authenticated;
grant insert (organizer_id, season_id, name, description, cover_url, logo_url, mode, platform, region, starts_at,
  registration_opens_at, registration_closes_at, matches_count, max_teams, team_size, reserves_allowed, requires_approval,
  entry_type, entry_fee_cents, prize_pool_cents, prize_description, visibility, dispute_window_minutes)
  on public.tournaments to authenticated;
grant update (season_id, name, description, cover_url, logo_url, mode, platform, region, starts_at,
  registration_opens_at, registration_closes_at, matches_count, max_teams, team_size, reserves_allowed, requires_approval,
  entry_type, entry_fee_cents, prize_pool_cents, prize_description, visibility, dispute_window_minutes)
  on public.tournaments to authenticated;
grant delete on public.tournaments to authenticated;
grant insert, update (content, updated_at) on public.tournament_rules to authenticated;
grant insert, update (placement_points, kill_points, max_bonus, tiebreakers) on public.tournament_scoring to authenticated;
grant insert, update, delete on public.tournament_prizes to authenticated;
grant insert (name, logo_url, url, tournament_id), update (name, logo_url, url), delete on public.sponsors to authenticated;
grant insert (tournament_id, number, map, scheduled_at), update (map, scheduled_at, status), delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_rooms to authenticated;
grant select, insert, delete on public.match_room_targets to authenticated;
grant insert (match_id, registration_id, placement, kills, bonus_points),
  update (placement, kills, bonus_points), delete on public.match_results to authenticated;
grant insert, update (kills), delete on public.match_player_stats to authenticated;
grant insert (tournament_id, author_id, title, body, pinned), update (title, body, pinned), delete on public.announcements to authenticated;
grant update (read_at), delete on public.notifications to authenticated;
grant insert (target_type, target_id, tournament_id, reason, description, evidence_urls) on public.reports to authenticated;
grant insert, update, delete on public.plans, public.seasons, public.achievements to authenticated; -- admin-only by RLS

-- ───────────────────────── RLS ─────────────────────────
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy "profiles: public read" on public.profiles for select using (true);
create policy "profiles: self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- roles
create policy "roles: self or admin" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());

-- plans / seasons / achievements: public read, admin write
create policy "plans: read" on public.plans for select using (true);
create policy "plans: admin" on public.plans for all using (public.is_admin()) with check (public.is_admin());
create policy "seasons: read" on public.seasons for select using (true);
create policy "seasons: admin" on public.seasons for all using (public.is_admin()) with check (public.is_admin());
create policy "achievements: read" on public.achievements for select using (true);
create policy "achievements: admin" on public.achievements for all using (public.is_admin()) with check (public.is_admin());
create policy "user_achievements: read" on public.user_achievements for select using (true);

-- organizers
create policy "organizers: read" on public.organizers for select using (true);
create policy "organizers: manage" on public.organizers for update
  using (public.can_manage_organizer(id)) with check (public.can_manage_organizer(id));
create policy "org_members: read" on public.organizer_members for select using (true);
create policy "org_members: owner adds staff" on public.organizer_members for insert
  with check (role = 'staff' and (public.is_admin() or exists (select 1 from public.organizer_members m
    where m.organizer_id = organizer_members.organizer_id and m.user_id = auth.uid() and m.role = 'owner')));
create policy "org_members: owner removes staff" on public.organizer_members for delete
  using (role = 'staff' and (public.is_admin() or exists (select 1 from public.organizer_members m
    where m.organizer_id = organizer_members.organizer_id and m.user_id = auth.uid() and m.role = 'owner')));
create policy "subscriptions: org or admin" on public.subscriptions for select
  using (public.is_admin() or public.is_org_member(organizer_id));

-- teams
create policy "teams: read" on public.teams for select using (true);
create policy "teams: captain edits" on public.teams for update
  using (public.is_team_captain(id) and public.is_active_user()) with check (public.is_team_captain(id));
create policy "team_members: read" on public.team_members for select using (true);
create policy "team_events: read" on public.team_member_events for select using (true);
create policy "team_invites: involved" on public.team_invites for select
  using (invited_user_id = auth.uid() or public.is_team_member(team_id) or public.is_admin());

-- tournaments
-- Policies check organizer_id directly: a lookup by id would not see the row inside its own INSERT ... RETURNING.
create policy "tournaments: read published or managed" on public.tournaments for select
  using ((status <> 'draft' and not hidden_by_admin) or public.can_manage_organizer(organizer_id));
create policy "tournaments: organizer creates" on public.tournaments for insert
  with check (public.can_manage_organizer(organizer_id));
create policy "tournaments: organizer edits until finished" on public.tournaments for update
  using (public.can_manage_organizer(organizer_id) and status not in ('finished', 'cancelled'))
  with check (public.can_manage_organizer(organizer_id));
create policy "tournaments: delete drafts" on public.tournaments for delete
  using (status = 'draft' and public.can_manage_organizer(organizer_id));

create policy "rules: read" on public.tournament_rules for select using (public.can_view_tournament(tournament_id));
create policy "rules: manage" on public.tournament_rules for all
  using (public.can_manage_tournament(tournament_id)) with check (public.can_manage_tournament(tournament_id));
create policy "scoring: read" on public.tournament_scoring for select using (public.can_view_tournament(tournament_id));
-- Scoring is frozen once results exist, so published points stay consistent.
create policy "scoring: manage before results" on public.tournament_scoring for all
  using (public.can_manage_tournament(tournament_id)
         and not exists (select 1 from public.match_results r where r.tournament_id = tournament_scoring.tournament_id))
  with check (public.can_manage_tournament(tournament_id));
create policy "prizes: read" on public.tournament_prizes for select using (public.can_view_tournament(tournament_id));
create policy "prizes: manage" on public.tournament_prizes for all
  using (public.can_manage_tournament(tournament_id)) with check (public.can_manage_tournament(tournament_id));
create policy "sponsors: read" on public.sponsors for select using (tournament_id is null or public.can_view_tournament(tournament_id));
create policy "sponsors: manage" on public.sponsors for all
  using (public.is_admin() or (tournament_id is not null and public.can_manage_tournament(tournament_id)))
  with check (public.is_admin() or (tournament_id is not null and public.can_manage_tournament(tournament_id)));

create policy "registrations: read" on public.tournament_registrations for select
  using (public.can_view_tournament(tournament_id) or public.is_team_member(team_id));
create policy "registration_players: read" on public.registration_players for select
  using (public.can_view_tournament(tournament_id) or user_id = auth.uid());

-- matches
create policy "matches: read" on public.matches for select using (public.can_view_tournament(tournament_id));
create policy "matches: manage" on public.matches for all
  using (public.can_manage_tournament(tournament_id)) with check (public.can_manage_tournament(tournament_id));

-- Room credentials: the strictest table. Readers must pass can_view_room().
create policy "rooms: authorized read" on public.match_rooms for select using (public.can_view_room(match_id));
create policy "rooms: manage" on public.match_rooms for all
  using (public.can_manage_tournament((select tournament_id from public.matches where id = match_id)))
  with check (public.can_manage_tournament((select tournament_id from public.matches where id = match_id)));
create policy "room_targets: read" on public.match_room_targets for select
  using (public.can_manage_tournament((select tournament_id from public.matches where id = match_id))
         or public.is_registration_member(registration_id));
create policy "room_targets: manage" on public.match_room_targets for all
  using (public.can_manage_tournament((select tournament_id from public.matches where id = match_id)))
  with check (public.can_manage_tournament((select tournament_id from public.matches where id = match_id)));

-- results: public once published; only managers write, never after the tournament is finished
create policy "results: read" on public.match_results for select
  using (public.can_manage_tournament(tournament_id)
         or (public.can_view_tournament(tournament_id)
             and exists (select 1 from public.matches m where m.id = match_id and m.results_status = 'published')));
create policy "results: manage while live" on public.match_results for all
  using (public.can_manage_tournament(tournament_id)
         and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status = 'live'))
  with check (public.can_manage_tournament((select m.tournament_id from public.matches m where m.id = match_id))
         and exists (select 1 from public.matches m join public.tournaments t on t.id = m.tournament_id
                     where m.id = match_id and t.status = 'live'));
create policy "player_stats: read" on public.match_player_stats for select
  using (exists (select 1 from public.match_results r where r.id = match_result_id)); -- inherits results RLS
create policy "player_stats: manage" on public.match_player_stats for all
  using (exists (select 1 from public.match_results r join public.tournaments t on t.id = r.tournament_id
                 where r.id = match_result_id and t.status = 'live' and public.can_manage_tournament(r.tournament_id)))
  with check (exists (select 1 from public.match_results r join public.tournaments t on t.id = r.tournament_id
                 where r.id = match_result_id and t.status = 'live' and public.can_manage_tournament(r.tournament_id)));

create policy "disputes: involved" on public.disputes for select
  using (public.is_admin() or public.can_manage_tournament(tournament_id) or public.is_registration_member(registration_id));

-- community
create policy "announcements: read" on public.announcements for select using (public.can_view_tournament(tournament_id));
create policy "announcements: manage" on public.announcements for all
  using (public.can_manage_tournament(tournament_id))
  with check (public.can_manage_tournament(tournament_id) and author_id = auth.uid());
create policy "notifications: own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: own delete" on public.notifications for delete using (user_id = auth.uid());

-- payments (read-only for clients; writes only via record_payment_status / server)
create policy "payments: involved" on public.payments for select
  using (payer_id = auth.uid() or public.is_admin() or (tournament_id is not null and public.can_manage_tournament(tournament_id)));
create policy "payment_events: involved" on public.payment_events for select
  using (exists (select 1 from public.payments p where p.id = payment_id));
create policy "refunds: involved" on public.refunds for select
  using (exists (select 1 from public.payments p where p.id = payment_id));

-- moderation
create policy "reports: create" on public.reports for insert with check (public.is_active_user());
create policy "reports: involved" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin() or (tournament_id is not null and public.can_manage_tournament(tournament_id)));
create policy "audit: admin or organizer" on public.audit_logs for select
  using (public.is_admin() or (tournament_id is not null and public.can_manage_tournament(tournament_id)));
create policy "settings: public keys" on public.platform_settings for select using (is_public or public.is_admin());

-- ───────────────────────── Realtime ─────────────────────────
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications, public.match_results, public.matches;
  end if;
end $$;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp']),
  ('team-logos', 'team-logos', true, 2097152, array['image/png','image/jpeg','image/webp']),
  ('tournament-media', 'tournament-media', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('evidence', 'evidence', false, 10485760, array['image/png','image/jpeg','image/webp','video/mp4'])
on conflict (id) do nothing;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin return p::uuid; exception when others then return null; end $$;
grant execute on function public.try_uuid(text) to anon, authenticated;

-- Uploads live under "<auth.uid()>/..." so users only write their own folder.
create policy "public media: read" on storage.objects for select
  using (bucket_id in ('avatars', 'team-logos', 'tournament-media'));
create policy "media: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'team-logos', 'tournament-media', 'evidence')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media: update own" on storage.objects for update to authenticated
  using (owner_id = auth.uid()::text) with check ((storage.foldername(name))[1] = auth.uid()::text);
create policy "media: delete own" on storage.objects for delete to authenticated
  using (owner_id = auth.uid()::text);
-- Evidence path: "<uid>/<tournament_id or 'geral'>/<file>"
create policy "evidence: owner, organizer, admin" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (
    owner_id = auth.uid()::text or public.is_admin()
    or public.can_manage_tournament(public.try_uuid((storage.foldername(name))[2]))));

-- ───────────────────────── Reference data ─────────────────────────
insert into public.plans (code, name, description, price_cents, max_active_tournaments, max_teams_per_tournament, features, sort_order) values
  ('FREE', 'Free', 'Para começar a organizar.', 0, 3, 48,
   '["Até 3 campeonatos ativos","Gestão de equipes e inscrições","Salas e resultados","Classificação automática"]', 0),
  ('PRO', 'Pro', 'Para ligas e organizadores frequentes.', 2990, 20, 100,
   '["Até 20 campeonatos ativos","Estatísticas avançadas","Personalização de página","Relatórios exportáveis","Equipe de staff"]', 1)
on conflict (code) do nothing;

insert into public.achievements (code, name, description, icon, tier) values
  ('first_tournament', 'Estreia', 'Disputou o primeiro campeonato até o fim.', 'Flag', 'bronze'),
  ('first_title', 'Primeira vitória', 'Conquistou o primeiro título de campeonato.', 'Trophy', 'gold'),
  ('hundred_kills', 'Centenário', '100 eliminações registradas em campeonatos verificados.', 'Crosshair', 'silver'),
  ('ten_tournaments', 'Veterano', 'Participou de 10 campeonatos finalizados.', 'Medal', 'silver'),
  ('season_champion', 'Campeão de temporada', 'Terminou uma temporada em primeiro lugar.', 'Crown', 'legend')
on conflict (code) do nothing;

insert into public.platform_settings (key, value, is_public) values
  ('payments_enabled', 'false', true),
  ('subscriptions_billing_enabled', 'false', true),
  ('organizer_requires_approval', 'false', true),
  ('platform_fee_percent', '10', false),
  ('announcement_banner', '""', true)
on conflict (key) do nothing;
