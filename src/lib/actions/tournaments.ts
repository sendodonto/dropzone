"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { announcementSchema, organizerSchema, tournamentSchema } from "@/lib/validation";
import { callRpc, dbError, formObject, invalid } from "@/lib/actions/helpers";
import { localInputToIso } from "@/lib/format";
import type { ActionResult, TournamentStatus } from "@/lib/types";

const prizeList = z
  .array(z.object({ position: z.number().int().min(1).max(100), label: z.string().trim().min(1).max(60),
    amount: z.number().min(0).max(1_000_000).default(0), description: z.string().max(200).optional() }))
  .max(20);
const tiebreakerList = z.array(z.enum(["wins", "kills", "best_placement", "placement_points", "last_match"])).min(1).max(5);

export async function createOrganizer(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = organizerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organizer", {
    p_name: parsed.data.name, p_description: parsed.data.description,
  });
  if (error) return dbError(error);
  if (parsed.data.contact_url || parsed.data.logo_url)
    await supabase.from("organizers").update({ contact_url: parsed.data.contact_url, logo_url: parsed.data.logo_url }).eq("id", orgId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil de organizador criado!", redirectTo: "/organizador" };
}

export async function updateOrganizer(orgId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = organizerSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase.from("organizers").update(parsed.data, { count: "exact" }).eq("id", orgId);
  if (error) return dbError(error);
  if (!count) return { ok: false, message: "Sem permissão para editar este organizador." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Organizador atualizado." };
}

/** Creates (tournamentId = null) or updates a tournament with rules, scoring and prizes. */
export async function saveTournament(organizerId: string, tournamentId: string | null, _: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = tournamentSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const prizes = prizeList.safeParse(JSON.parse(d.prizes || "[]"));
  if (!prizes.success) return { ok: false, message: "Revise a distribuição de prêmios." };
  const tiebreakers = tiebreakerList.safeParse(d.tiebreakers.split(",").filter(Boolean));
  if (!tiebreakers.success) return { ok: false, message: "Critérios de desempate inválidos." };
  const startsAt = localInputToIso(d.starts_at)!;
  if (!tournamentId && new Date(startsAt) <= new Date()) return { ok: false, message: "A data de início precisa estar no futuro." };

  const row = {
    name: d.name, description: d.description, cover_url: d.cover_url, logo_url: d.logo_url, mode: d.mode,
    platform: d.platform, region: d.region, max_teams: d.max_teams, team_size: d.team_size,
    reserves_allowed: d.reserves_allowed, matches_count: d.matches_count, starts_at: startsAt,
    registration_opens_at: d.registration_opens_at ? localInputToIso(d.registration_opens_at) : null,
    registration_closes_at: d.registration_closes_at ? localInputToIso(d.registration_closes_at) : null,
    requires_approval: d.requires_approval, visibility: d.visibility, entry_type: d.entry_type,
    entry_fee_cents: d.entry_type === "paid" ? Math.round(d.entry_fee * 100) : 0,
    prize_pool_cents: Math.round(d.prize_pool * 100), prize_description: d.prize_description,
    dispute_window_minutes: d.dispute_window_minutes, season_id: d.season_id,
  };

  const supabase = await createClient();
  let id = tournamentId;
  let slug: string | null = null;
  if (id) {
    const { data, error } = await supabase.from("tournaments").update(row).eq("id", id).select("slug").maybeSingle();
    if (error) return dbError(error);
    if (!data) return { ok: false, message: "Campeonato não encontrado ou já encerrado." };
    slug = data.slug;
  } else {
    const { data, error } = await supabase.from("tournaments").insert({ ...row, organizer_id: organizerId }).select("id, slug").single();
    if (error) return dbError(error);
    id = data.id;
    slug = data.slug;
  }

  const placementPoints = d.placement_points.split(",").map((s) => Number(s.trim()));
  const [rules, scoring] = await Promise.all([
    // Row is created by the tournaments_after_insert trigger; tournament_id itself is not updatable.
    supabase.from("tournament_rules").update({ content: d.rules, updated_at: new Date().toISOString() }).eq("tournament_id", id),
    supabase.from("tournament_scoring").update({ placement_points: placementPoints, kill_points: d.kill_points,
      max_bonus: d.max_bonus, tiebreakers: tiebreakers.data }).eq("tournament_id", id),
  ]);
  if (rules.error) return dbError(rules.error);
  if (scoring.error) return dbError(scoring.error);

  const sponsors = z.array(z.object({ name: z.string().trim().min(1).max(60), url: z.url().optional().or(z.literal("")) })).max(10)
    .safeParse(JSON.parse(String(fd.get("sponsors") || "[]")));
  if (sponsors.success) {
    await supabase.from("sponsors").delete().eq("tournament_id", id);
    if (sponsors.data.length)
      await supabase.from("sponsors").insert(sponsors.data.map((s) => ({ tournament_id: id, name: s.name, url: s.url || null })));
  }

  const del = await supabase.from("tournament_prizes").delete().eq("tournament_id", id);
  if (del.error) return dbError(del.error);
  if (prizes.data.length) {
    const ins = await supabase.from("tournament_prizes").insert(prizes.data.map((p) => ({
      tournament_id: id, position: p.position, label: p.label, amount_cents: Math.round(p.amount * 100), description: p.description ?? null,
    })));
    if (ins.error) return dbError(ins.error);
  }

  if (d.publish && !tournamentId) {
    const { error } = await supabase.rpc("publish_tournament", { p_tournament: id });
    revalidatePath("/", "layout");
    if (error) return { ok: true, message: `Salvo como rascunho. Não publicado: ${error.message}`, redirectTo: `/organizador/campeonatos/${id}` };
    return { ok: true, message: "Campeonato publicado!", redirectTo: `/organizador/campeonatos/${id}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: tournamentId ? "Alterações salvas." : "Rascunho salvo.", redirectTo: tournamentId ? undefined : `/organizador/campeonatos/${id}`, data: { slug } };
}

export async function publishTournament(id: string) {
  return callRpc("publish_tournament", { p_tournament: id }, { success: "Campeonato publicado!" });
}

export async function setTournamentStatus(id: string, status: TournamentStatus, reason?: string) {
  const msg: Partial<Record<TournamentStatus, string>> = {
    registration_open: "Inscrições reabertas.", registration_closed: "Inscrições encerradas.",
    live: "Campeonato iniciado!", cancelled: "Campeonato cancelado.",
  };
  return callRpc("set_tournament_status", { p_tournament: id, p_status: status, p_reason: reason ?? null }, { success: msg[status] });
}

export async function requestPaidEntry(id: string) {
  return callRpc("request_paid_entry", { p_tournament: id }, { success: "Solicitação enviada ao administrador." });
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("tournaments").delete({ count: "exact" }).eq("id", id).eq("status", "draft");
  if (error) return dbError(error);
  if (!count) return { ok: false, message: "Apenas rascunhos podem ser excluídos." };
  revalidatePath("/organizador", "layout");
  return { ok: true, message: "Rascunho excluído.", redirectTo: "/organizador/campeonatos" };
}

export async function registerTeam(tournamentId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const team = z.uuid().safeParse(fd.get("team_id"));
  if (!team.success) return { ok: false, message: "Escolha um squad." };
  const players = fd.getAll("players[]").map(String);
  const reserves = fd.getAll("reserves[]").map(String).filter((r) => !players.includes(r));
  const r = await callRpc("register_team", {
    p_tournament: tournamentId, p_team: team.data, p_players: players, p_reserves: reserves,
    p_invite_code: String(fd.get("invite_code") ?? "") || null,
  }, { success: "Inscrição enviada!" });
  return r;
}

export async function withdrawRegistration(registrationId: string) {
  return callRpc("withdraw_registration", { p_registration: registrationId }, { success: "Inscrição cancelada." });
}

export async function reviewRegistration(registrationId: string, status: "confirmed" | "rejected" | "removed", reason?: string) {
  const msg = { confirmed: "Inscrição aprovada.", rejected: "Inscrição recusada.", removed: "Equipe removida." }[status];
  return callRpc("review_registration", { p_registration: registrationId, p_status: status, p_reason: reason ?? null }, { success: msg });
}

export async function postAnnouncement(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("announcements").insert({ ...parsed.data, author_id: auth.user?.id });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Aviso publicado e participantes notificados." };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("announcements").delete({ count: "exact" }).eq("id", id);
  if (error) return dbError(error);
  if (!count) return { ok: false, message: "Sem permissão." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Aviso removido." };
}
