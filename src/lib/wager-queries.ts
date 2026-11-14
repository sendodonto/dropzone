import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CaptainTeam } from "@/components/wagers/wager-forms";

/** Squads the viewer captains, with members and their 18+ confirmation (for X2–X4 rosters). */
export async function getCaptainTeams(viewerId: string): Promise<CaptainTeam[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams")
    .select("id, name, members:team_members(user_id, role, profile:profiles(username, display_name, adult_confirmed_at, status))")
    .eq("captain_id", viewerId);
  type Row = { id: string; name: string; members: { user_id: string; role: string; profile: { username: string; display_name: string | null; adult_confirmed_at: string | null; status: string } }[] };
  return ((data ?? []) as unknown as Row[]).map((t) => ({
    id: t.id, name: t.name,
    members: t.members.filter((m) => m.profile?.status === "active")
      .sort((a, b) => (a.role === "captain" ? -1 : b.role === "captain" ? 1 : 0))
      .map((m) => ({ user_id: m.user_id, name: m.profile.display_name ?? m.profile.username, adult: !!m.profile.adult_confirmed_at, me: m.user_id === viewerId })),
  }));
}

/** Public names for the players listed on wagers. */
export async function getPlayerNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p: { id: string; username: string; display_name: string | null }) => [p.id, p.display_name ?? p.username]));
}

export async function getWagerSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key, value")
    .in("key", ["wagers_enabled", "wager_fee_percent", "wager_payment_instructions"]);
  const get = (k: string) => (data ?? []).find((s) => s.key === k)?.value;
  return {
    enabled: get("wagers_enabled") === true,
    feePercent: Number(get("wager_fee_percent") ?? 10),
    paymentInstructions: typeof get("wager_payment_instructions") === "string" ? (get("wager_payment_instructions") as string) : "",
  };
}
