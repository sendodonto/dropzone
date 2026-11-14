import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StandingRow, TournamentCardData } from "@/lib/types";

export const CARD_SELECT =
  "*, organizer:organizers(name, slug, logo_url, is_official), registrations:tournament_registrations(count)";

export interface TournamentFilters {
  q?: string;
  status?: "open" | "live" | "finished" | "upcoming";
  price?: "free" | "paid";
  mode?: "squad" | "duo" | "solo";
  from?: string; // yyyy-mm-dd
  prize?: "any" | "with" | "100" | "1000";
  slots?: "available";
  organizer?: string; // organizer id
  limit?: number;
}

export async function listTournaments(f: TournamentFilters = {}): Promise<TournamentCardData[]> {
  const supabase = await createClient();
  let q = supabase
    .from("tournaments")
    .select(CARD_SELECT)
    .eq("visibility", "public")
    .eq("hidden_by_admin", false)
    .neq("status", "draft")
    .in("registrations.status", ["pending", "confirmed"]);

  if (f.q) q = q.ilike("name", `%${f.q.replace(/[%_]/g, "")}%`);
  if (f.status === "open") q = q.eq("status", "registration_open");
  else if (f.status === "live") q = q.eq("status", "live");
  else if (f.status === "finished") q = q.eq("status", "finished");
  else if (f.status === "upcoming") q = q.in("status", ["registration_open", "registration_closed"]);
  else q = q.neq("status", "cancelled");
  if (f.price === "free") q = q.in("entry_type", ["free", "sponsored"]);
  if (f.price === "paid") q = q.in("entry_type", ["paid", "external"]);
  if (f.mode) q = q.eq("mode", f.mode);
  if (f.from) q = q.gte("starts_at", new Date(`${f.from}T00:00:00-03:00`).toISOString());
  if (f.prize === "with") q = q.or("prize_pool_cents.gt.0,prize_description.not.is.null");
  if (f.prize === "100") q = q.gte("prize_pool_cents", 10000);
  if (f.prize === "1000") q = q.gte("prize_pool_cents", 100000);
  if (f.organizer) q = q.eq("organizer_id", f.organizer);

  const finishedFirst = f.status === "finished";
  q = q.order("starts_at", { ascending: !finishedFirst }).limit(f.limit ?? 60);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as unknown as TournamentCardData[];
  if (f.slots === "available") rows = rows.filter((t) => regCount(t) < t.max_teams);
  return rows;
}

export function regCount(t: TournamentCardData) {
  return t.registrations?.[0]?.count ?? 0;
}

export async function getStandings(tournamentId: string, includeDrafts = false): Promise<StandingRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_tournament_standings", { p_tournament: tournamentId, p_include_drafts: includeDrafts });
  if (error) throw new Error(error.message);
  return (data ?? []) as StandingRow[];
}

export function sinceFor(period: string | undefined) {
  const d = new Date();
  if (period === "semana") d.setDate(d.getDate() - 7);
  else if (period === "mes") d.setMonth(d.getMonth() - 1);
  else return null;
  return d.toISOString();
}
