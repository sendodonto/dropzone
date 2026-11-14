import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RegistrationStatus, Team, Tournament } from "@/lib/types";

export interface MyRegistration {
  id: string;
  status: RegistrationStatus;
  final_rank: number | null;
  team: Pick<Team, "id" | "name" | "tag" | "slug" | "logo_url" | "captain_id">;
  tournament: Pick<Tournament, "id" | "name" | "slug" | "starts_at" | "status" | "mode" | "is_demo">;
}

const REG_SELECT =
  "id, status, final_rank, team:teams(id, name, tag, slug, logo_url, captain_id), tournament:tournaments(id, name, slug, starts_at, status, mode, is_demo)";

/** Registrations where the user is on the roster or captains the team. */
export async function getMyRegistrations(userId: string): Promise<MyRegistration[]> {
  const supabase = await createClient();
  const [{ data: rostered }, { data: myTeams }] = await Promise.all([
    supabase.from("registration_players").select("registration:tournament_registrations(" + REG_SELECT + ")").eq("user_id", userId),
    supabase.from("teams").select("id").eq("captain_id", userId),
  ]);
  const teamIds = (myTeams ?? []).map((t) => t.id);
  const { data: captained } = teamIds.length
    ? await supabase.from("tournament_registrations").select(REG_SELECT).in("team_id", teamIds)
    : { data: [] };
  const map = new Map<string, MyRegistration>();
  for (const r of (rostered ?? []) as unknown as { registration: MyRegistration | null }[]) if (r.registration) map.set(r.registration.id, r.registration);
  for (const r of (captained ?? []) as unknown as MyRegistration[]) map.set(r.id, r);
  return [...map.values()].filter((r) => r.tournament && r.team).sort((a, b) => +new Date(b.tournament.starts_at) - +new Date(a.tournament.starts_at));
}

export async function getMyTeams(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("role, team:teams(id, name, tag, slug, logo_url, captain_id, is_demo, members:team_members(count))")
    .eq("user_id", userId);
  return ((data ?? []) as unknown as { role: string; team: Team & { members: { count: number }[] } }[]).filter((m) => m.team);
}

export async function getMyInvites(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_invites")
    .select("id, created_at, team:teams(id, name, tag, slug, logo_url), inviter:profiles!team_invites_invited_by_fkey(username, display_name)")
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as {
    id: string; created_at: string;
    team: Pick<Team, "id" | "name" | "tag" | "slug" | "logo_url">;
    inviter: { username: string; display_name: string } | null;
  }[];
}
