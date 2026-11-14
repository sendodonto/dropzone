import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Match, MatchRoom, Organizer, RegistrationStatus, Scoring, Team, Tournament } from "@/lib/types";

export type RegistrationRow = {
  id: string; status: RegistrationStatus; status_reason: string | null; final_rank: number | null; created_at: string;
  team: Pick<Team, "id" | "name" | "tag" | "slug" | "logo_url" | "captain_id">;
  players: { user_id: string; is_reserve: boolean; profile: { username: string; display_name: string; avatar_url: string | null } | null }[];
};

export const getTournamentBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*, organizer:organizers(*)")
    .eq("slug", slug)
    .maybeSingle();
  return data as (Tournament & { organizer: Organizer }) | null;
});

/** Everything the tournament page and the organizer console need, in parallel. RLS trims what the viewer may not see. */
export async function getTournamentBundle(t: Tournament) {
  const supabase = await createClient();
  const [rules, scoring, prizes, sponsors, announcements, regs, matches, rooms, roomStatus] = await Promise.all([
    supabase.from("tournament_rules").select("content").eq("tournament_id", t.id).maybeSingle(),
    supabase.from("tournament_scoring").select("*").eq("tournament_id", t.id).maybeSingle(),
    supabase.from("tournament_prizes").select("*").eq("tournament_id", t.id).order("position"),
    supabase.from("sponsors").select("*").eq("tournament_id", t.id),
    supabase.from("announcements").select("*, author:profiles(username, display_name)").eq("tournament_id", t.id)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("tournament_registrations")
      .select("id, status, status_reason, final_rank, created_at, team:teams(id, name, tag, slug, logo_url, captain_id), players:registration_players(user_id, is_reserve, profile:profiles(username, display_name, avatar_url))")
      .eq("tournament_id", t.id).order("created_at"),
    supabase.from("matches").select("*").eq("tournament_id", t.id).order("number"),
    supabase.from("match_rooms").select("*, match:matches!inner(tournament_id)").eq("match.tournament_id", t.id),
    supabase.rpc("match_room_status", { p_tournament: t.id }),
  ]);
  return {
    rules: (rules.data?.content as string) ?? "",
    scoring: scoring.data as Scoring | null,
    prizes: (prizes.data ?? []) as { id: string; position: number; label: string; amount_cents: number; description: string | null }[],
    sponsors: (sponsors.data ?? []) as { id: string; name: string; logo_url: string | null; url: string | null }[],
    announcements: (announcements.data ?? []) as { id: string; title: string; body: string; pinned: boolean; created_at: string; author: { username: string; display_name: string } | null }[],
    registrations: (regs.data ?? []) as unknown as RegistrationRow[],
    matches: (matches.data ?? []) as Match[],
    rooms: (rooms.data ?? []) as unknown as MatchRoom[],
    roomStatus: (roomStatus.data ?? []) as { match_id: string; published: boolean; opens_at: string | null; audience: string }[],
  };
}

export async function getMatchResults(tournamentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("match_results").select("*").eq("tournament_id", tournamentId);
  return (data ?? []) as { id: string; match_id: string; registration_id: string; placement: number; kills: number; bonus_points: number; total_points: number; placement_points: number; kill_points: number }[];
}
