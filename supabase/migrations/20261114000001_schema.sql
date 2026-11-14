-- DROPZONE · 0001 · Schema (tables, enums, indexes)
-- All primary keys are UUIDs. Business rules live in 0003_functions.sql,
-- access rules in 0002_rls.sql.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ───────────────────────── Enums ─────────────────────────
create type public.app_role as enum ('admin', 'moderator');
create type public.account_status as enum ('active', 'suspended', 'banned');
create type public.user_intent as enum ('play', 'organize', 'both');
create type public.game_mode as enum ('squad', 'duo', 'solo');
create type public.game_platform as enum ('mobile', 'emulator', 'mixed');
create type public.organizer_status as enum ('pending', 'approved', 'suspended');
create type public.org_member_role as enum ('owner', 'staff');
create type public.team_role as enum ('captain', 'player');
create type public.invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.tournament_status as enum (
  'draft', 'registration_open', 'registration_closed', 'live', 'finished', 'cancelled'
);
create type public.tournament_visibility as enum ('public', 'unlisted', 'private');
create type public.entry_type as enum ('free', 'paid', 'sponsored');
create type public.paid_request_status as enum ('none', 'requested', 'approved', 'denied');
create type public.registration_status as enum ('pending', 'confirmed', 'rejected', 'withdrawn', 'removed');
create type public.match_status as enum ('scheduled', 'live', 'finished', 'cancelled');
create type public.results_status as enum ('none', 'draft', 'published');
create type public.room_audience as enum ('all_participants', 'confirmed', 'specific');
create type public.dispute_status as enum ('open', 'accepted', 'rejected');
create type public.payment_status as enum ('pending', 'in_review', 'confirmed', 'declined', 'refunded');
create type public.refund_status as enum ('requested', 'processing', 'completed', 'declined');
create type public.report_reason as enum (
  'fraud', 'suspicious_result', 'misconduct', 'false_information', 'rules_violation'
);
create type public.report_target as enum ('user', 'team', 'tournament', 'match');
create type public.report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type public.subscription_status as enum ('active', 'pending', 'cancelled', 'expired');

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(txt, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── Accounts ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  ff_id text check (ff_id ~ '^[0-9]{5,15}$'),
  region text,
  preferred_mode public.game_mode,
  intent public.user_intent not null default 'play',
  onboarded boolean not null default false,
  status public.account_status not null default 'active',
  status_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ───────────────────────── Plans & organizers ─────────────────────────
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  max_active_tournaments integer not null check (max_active_tournaments > 0),
  max_teams_per_tournament integer not null default 48,
  features jsonb not null default '[]',
  billing_enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 2 and 60),
  description text check (char_length(description) <= 1000),
  logo_url text,
  contact_url text,
  owner_id uuid not null references public.profiles(id),
  status public.organizer_status not null default 'approved',
  status_reason text,
  is_official boolean not null default false,
  plan_id uuid references public.plans(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizers_owner_idx on public.organizers(owner_id);
create trigger organizers_touch before update on public.organizers
  for each row execute function public.touch_updated_at();

create table public.organizer_members (
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organizer_id, user_id)
);
create index organizer_members_user_idx on public.organizer_members(user_id);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'pending',
  provider text,
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
create index subscriptions_org_idx on public.subscriptions(organizer_id);

-- ───────────────────────── Teams ─────────────────────────
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 2 and 32),
  tag text not null check (tag ~ '^[A-Z0-9]{2,5}$'),
  logo_url text,
  description text check (char_length(description) <= 500),
  captain_id uuid not null references public.profiles(id),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_captain_idx on public.teams(captain_id);
create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members(user_id);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index team_invites_one_pending on public.team_invites(team_id, invited_user_id)
  where status = 'pending';
create index team_invites_user_idx on public.team_invites(invited_user_id, status);

-- Public history of roster changes
create table public.team_member_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, -- created | joined | left | removed | captain_transferred
  created_at timestamptz not null default now()
);
create index team_member_events_team_idx on public.team_member_events(team_id, created_at desc);

-- ───────────────────────── Seasons ─────────────────────────
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  starts_at date not null,
  ends_at date not null check (ends_at >= starts_at),
  rewards_description text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Tournaments ─────────────────────────
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  organizer_id uuid not null references public.organizers(id),
  season_id uuid references public.seasons(id) on delete set null,
  name text not null check (char_length(name) between 3 and 80),
  description text check (char_length(description) <= 4000),
  cover_url text,
  logo_url text,
  mode public.game_mode not null default 'squad',
  platform public.game_platform not null default 'mobile',
  region text not null default 'BR',
  starts_at timestamptz not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  matches_count integer not null default 4 check (matches_count between 1 and 20),
  max_teams integer not null default 12 check (max_teams between 2 and 100),
  team_size integer not null default 4 check (team_size between 1 and 4),
  reserves_allowed integer not null default 1 check (reserves_allowed between 0 and 2),
  requires_approval boolean not null default false,
  entry_type public.entry_type not null default 'free',
  entry_fee_cents integer not null default 0 check (entry_fee_cents >= 0),
  paid_request_status public.paid_request_status not null default 'none',
  payments_enabled boolean not null default false, -- only an admin can flip this
  prize_pool_cents integer not null default 0 check (prize_pool_cents >= 0),
  prize_description text check (char_length(prize_description) <= 500),
  status public.tournament_status not null default 'draft',
  visibility public.tournament_visibility not null default 'public',
  invite_code text,
  dispute_window_minutes integer not null default 30 check (dispute_window_minutes between 0 and 10080),
  hidden_by_admin boolean not null default false,
  hidden_reason text,
  featured boolean not null default false,
  cancel_reason text,
  published_at timestamptz,
  finished_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (registration_closes_at is null or registration_opens_at is null or registration_closes_at > registration_opens_at),
  check (entry_type <> 'paid' or entry_fee_cents > 0)
);
create index tournaments_org_idx on public.tournaments(organizer_id);
create index tournaments_status_idx on public.tournaments(status, starts_at);
create index tournaments_season_idx on public.tournaments(season_id);
create trigger tournaments_touch before update on public.tournaments
  for each row execute function public.touch_updated_at();

create table public.tournament_rules (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 20000),
  updated_at timestamptz not null default now()
);

create table public.tournament_scoring (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  -- placement_points[1] = points for 1st place, etc. Missing positions score 0.
  placement_points integer[] not null default '{12,9,8,7,6,5,4,3,2,1}',
  kill_points numeric(5,2) not null default 1 check (kill_points >= 0),
  max_bonus integer not null default 0 check (max_bonus >= 0),
  -- Applied in order after total points.
  tiebreakers text[] not null default '{wins,kills,best_placement,last_match}',
  check (tiebreakers <@ array['wins','kills','best_placement','placement_points','last_match']::text[])
);

create table public.tournament_prizes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  label text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  description text,
  unique (tournament_id, position)
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  url text,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  featured boolean not null default false, -- sponsored highlight on the platform (admin-managed)
  created_at timestamptz not null default now()
);
create index sponsors_tournament_idx on public.sponsors(tournament_id);

create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  status public.registration_status not null default 'pending',
  status_reason text,
  final_rank integer,
  registered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);
create index registrations_team_idx on public.tournament_registrations(team_id);
create trigger registrations_touch before update on public.tournament_registrations
  for each row execute function public.touch_updated_at();

-- Locked roster for one tournament. The unique key is what stops a player
-- from playing for two squads in the same competition.
create table public.registration_players (
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  is_reserve boolean not null default false,
  primary key (registration_id, user_id),
  unique (tournament_id, user_id)
);
create index registration_players_user_idx on public.registration_players(user_id);

-- ───────────────────────── Matches ─────────────────────────
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  number integer not null check (number between 1 and 20),
  map text not null default 'Bermuda',
  scheduled_at timestamptz,
  status public.match_status not null default 'scheduled',
  results_status public.results_status not null default 'none',
  results_published_at timestamptz,
  dispute_deadline timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, number)
);

-- Private room credentials. Separate table so RLS can hide them entirely.
create table public.match_rooms (
  match_id uuid primary key references public.matches(id) on delete cascade,
  room_code text not null check (char_length(room_code) between 1 and 30),
  room_password text check (char_length(room_password) <= 30),
  instructions text check (char_length(instructions) <= 1000),
  audience public.room_audience not null default 'confirmed',
  opens_at timestamptz, -- credentials become visible to the audience at this time
  published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.match_room_targets (
  match_id uuid not null references public.matches(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  primary key (match_id, registration_id)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  placement integer not null check (placement between 1 and 100),
  kills integer not null default 0 check (kills between 0 and 200),
  bonus_points integer not null default 0,
  placement_points integer not null default 0, -- computed by trigger
  kill_points numeric(7,2) not null default 0,  -- computed by trigger
  total_points numeric(7,2) not null default 0, -- computed by trigger
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (match_id, registration_id),
  unique (match_id, placement) deferrable initially deferred -- lets a sheet swap placements atomically
);
create index match_results_tournament_idx on public.match_results(tournament_id);
create index match_results_registration_idx on public.match_results(registration_id);

-- Optional per-player kill split (feeds player rankings).
create table public.match_player_stats (
  match_result_id uuid not null references public.match_results(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  kills integer not null default 0 check (kills between 0 and 100),
  primary key (match_result_id, user_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_id uuid not null references public.tournament_registrations(id) on delete cascade,
  opened_by uuid not null references public.profiles(id),
  reason text not null check (char_length(reason) between 10 and 2000),
  evidence_urls text[] not null default '{}',
  status public.dispute_status not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index disputes_tournament_idx on public.disputes(tournament_id, status);

-- ───────────────────────── Community ─────────────────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index announcements_tournament_idx on public.announcements(tournament_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- invite | registration | schedule | room | results | announcement | report | system
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  emailed_at timestamptz, -- reserved for the email dispatcher
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null, -- lucide icon name
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','legend'))
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null references public.achievements(code),
  tournament_id uuid references public.tournaments(id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

-- ───────────────────────── Payments (structure only) ─────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete set null,
  registration_id uuid references public.tournament_registrations(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payer_id uuid not null references public.profiles(id),
  provider text not null,       -- adapter id, e.g. 'manual-review', 'mercadopago'
  provider_ref text,            -- provider transaction id. Card data is never stored.
  method text,                  -- pix | card | boleto ...
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  currency text not null default 'BRL',
  status public.payment_status not null default 'pending',
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_tournament_idx on public.payments(tournament_id);
create index payments_payer_idx on public.payments(payer_id);

-- Append-only status history: no one can flip a payment silently.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  from_status public.payment_status,
  to_status public.payment_status not null,
  actor_id uuid references public.profiles(id),
  source text not null, -- 'provider_webhook' | 'admin' | 'organizer'
  note text,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount_cents integer not null check (amount_cents > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  requested_by uuid not null references public.profiles(id),
  provider_ref text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Moderation ─────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type public.report_target not null,
  target_id uuid not null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  reason public.report_reason not null,
  description text not null check (char_length(description) between 10 and 2000),
  evidence_urls text[] not null default '{}',
  status public.report_status not null default 'open',
  decision text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports(status, created_at desc);
create index reports_tournament_idx on public.reports(tournament_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  tournament_id uuid references public.tournaments(id) on delete set null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_tournament_idx on public.audit_logs(tournament_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
