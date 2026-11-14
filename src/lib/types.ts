// Row shapes for the tables the UI reads. Mirrors supabase/migrations.
// Regenerate full types with `npm run db:types` once a database is linked.

export type GameMode = "squad" | "duo" | "solo";
export type TournamentStatus = "draft" | "registration_open" | "registration_closed" | "live" | "finished" | "cancelled";
export type RegistrationStatus = "pending" | "confirmed" | "rejected" | "withdrawn" | "removed";
export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type EntryType = "free" | "paid" | "sponsored" | "external";
export type Visibility = "public" | "unlisted" | "private";
export type RoomAudience = "all_participants" | "confirmed" | "specific";
export type PaymentStatus = "pending" | "in_review" | "confirmed" | "declined" | "refunded";
export type ReportReason = "fraud" | "suspicious_result" | "misconduct" | "false_information" | "rules_violation";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  ff_id: string | null;
  region: string | null;
  preferred_mode: GameMode | null;
  intent: "play" | "organize" | "both";
  onboarded: boolean;
  status: "active" | "suspended" | "banned";
  status_reason: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface Organizer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  contact_url: string | null;
  owner_id: string;
  status: "pending" | "approved" | "suspended";
  status_reason: string | null;
  is_official: boolean;
  plan_id: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  tag: string;
  logo_url: string | null;
  description: string | null;
  captain_id: string;
  is_demo: boolean;
  created_at: string;
}

export interface Tournament {
  id: string;
  slug: string;
  organizer_id: string;
  season_id: string | null;
  name: string;
  description: string | null;
  cover_url: string | null;
  logo_url: string | null;
  mode: GameMode;
  platform: "mobile" | "emulator" | "mixed";
  region: string;
  starts_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  matches_count: number;
  max_teams: number;
  team_size: number;
  reserves_allowed: number;
  requires_approval: boolean;
  entry_type: EntryType;
  entry_fee_cents: number;
  /** For entry_type 'external': how to pay the organizer (e.g. Pix key). */
  payment_instructions?: string | null;
  paid_request_status: "none" | "requested" | "approved" | "denied";
  payments_enabled: boolean;
  prize_pool_cents: number;
  prize_description: string | null;
  status: TournamentStatus;
  visibility: Visibility;
  invite_code: string | null;
  dispute_window_minutes: number;
  hidden_by_admin: boolean;
  hidden_reason: string | null;
  featured: boolean;
  cancel_reason: string | null;
  published_at: string | null;
  finished_at: string | null;
  is_demo: boolean;
  created_at: string;
}

export type TournamentCardData = Tournament & {
  organizer: Pick<Organizer, "name" | "slug" | "logo_url" | "is_official"> | null;
  registrations: { count: number }[];
};

export interface Match {
  id: string;
  tournament_id: string;
  number: number;
  /** Queda number shown to people; with groups several matches share a round. */
  round: number | null;
  group_label: string | null;
  map: string;
  scheduled_at: string | null;
  status: MatchStatus;
  results_status: "none" | "draft" | "published";
  results_published_at: string | null;
  dispute_deadline: string | null;
}

export interface MatchRoom {
  match_id: string;
  room_code: string;
  room_password: string | null;
  instructions: string | null;
  audience: RoomAudience;
  opens_at: string | null;
  published: boolean;
  published_at: string | null;
}

export interface MatchResult {
  id: string;
  match_id: string;
  registration_id: string;
  placement: number;
  kills: number;
  bonus_points: number;
  placement_points: number;
  kill_points: number;
  total_points: number;
}

export interface Scoring {
  tournament_id: string;
  placement_points: number[];
  kill_points: number;
  max_bonus: number;
  tiebreakers: Tiebreaker[];
}
export type Tiebreaker = "wins" | "kills" | "best_placement" | "placement_points" | "last_match";

export interface StandingRow {
  rank: number;
  registration_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  team_slug: string;
  team_logo: string | null;
  matches_played: number;
  total_points: number;
  placement_points: number;
  kills: number;
  wins: number;
  best_placement: number | null;
  last_placement: number | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export type ActionResult<T = unknown> =
  | { ok: true; message?: string; data?: T; redirectTo?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };
