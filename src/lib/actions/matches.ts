"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resultRowSchema, roomSchema } from "@/lib/validation";
import { callRpc, dbError, formObject, invalid } from "@/lib/actions/helpers";
import { localInputToIso } from "@/lib/format";
import { validateResultSheet } from "@/lib/scoring";
import type { ActionResult } from "@/lib/types";

export async function saveRoom(_: unknown, fd: FormData): Promise<ActionResult> {
  const obj = formObject(fd);
  const parsed = roomSchema.safeParse({ ...obj, targets: obj["targets[]"] ?? [] });
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const match = await supabase.from("matches")
    .update({ map: d.map, scheduled_at: d.scheduled_at ? localInputToIso(d.scheduled_at) : null })
    .eq("id", d.match_id).select("id").maybeSingle();
  if (match.error) return dbError(match.error);
  if (!match.data) return { ok: false, message: "Sem permissão para esta partida." };
  const room = await supabase.from("match_rooms").upsert({
    match_id: d.match_id, room_code: d.room_code, room_password: d.room_password, instructions: d.instructions,
    audience: d.audience, opens_at: d.opens_at ? localInputToIso(d.opens_at) : null, updated_at: new Date().toISOString(),
  });
  if (room.error) return dbError(room.error);
  await supabase.from("match_room_targets").delete().eq("match_id", d.match_id);
  if (d.audience === "specific") {
    if (!d.targets.length) return { ok: false, message: "Selecione ao menos uma equipe." };
    const t = await supabase.from("match_room_targets").insert(d.targets.map((r) => ({ match_id: d.match_id, registration_id: r })));
    if (t.error) return dbError(t.error);
  }
  if (d.publish) return callRpc("publish_match_room", { p_match: d.match_id, p_publish: true }, { success: "Sala salva e publicada." });
  revalidatePath("/", "layout");
  return { ok: true, message: "Sala salva (ainda não publicada)." };
}

export async function setRoomPublished(matchId: string, publish: boolean) {
  return callRpc("publish_match_room", { p_match: matchId, p_publish: publish },
    { success: publish ? "Sala publicada." : "Sala ocultada." });
}

export async function setMatchLive(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("matches").update({ status: "live" }, { count: "exact" }).eq("id", matchId).eq("status", "scheduled");
  if (error) return dbError(error);
  if (!count) return { ok: false, message: "A partida não está agendada." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Partida em andamento." };
}

/** Replaces the whole result sheet of a match (draft or correction). */
export async function saveResults(matchId: string, rowsJson: string): Promise<ActionResult> {
  const rows = z.array(resultRowSchema).max(100).safeParse(JSON.parse(rowsJson));
  if (!rows.success) return invalid(rows.error);
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("id, tournament_id, results_status").eq("id", matchId).maybeSingle();
  if (!match) return { ok: false, message: "Partida não encontrada." };
  const { count } = await supabase.from("tournament_registrations").select("id", { count: "exact", head: true })
    .eq("tournament_id", match.tournament_id).eq("status", "confirmed");
  const errors = validateResultSheet(rows.data, Math.max(count ?? 0, 1));
  if (errors.length) return { ok: false, message: errors[0] };

  const r = await callRpc("save_match_results", { p_match: matchId, p_rows: rows.data });
  if (!r.ok) return r;
  return { ok: true, message: match.results_status === "published" ? "Correção salva e registrada no histórico." : "Resultados salvos como rascunho." };
}

export async function publishResults(matchId: string) {
  return callRpc("publish_match_results", { p_match: matchId }, { success: "Resultados publicados. Classificação atualizada." });
}

export async function finalizeTournament(tournamentId: string) {
  return callRpc("finalize_tournament", { p_tournament: tournamentId }, { success: "Campeonato finalizado!" });
}

export async function openDispute(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    match_id: z.uuid(), registration_id: z.uuid(),
    reason: z.string().trim().min(10, "Descreva o problema (mínimo 10 caracteres).").max(2000),
    evidence: z.string().max(2000).default(""),
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const evidence = parsed.data.evidence.split(/\s+/).filter((u) => /^https?:\/\//.test(u)).slice(0, 5);
  return callRpc("open_dispute", { p_match: parsed.data.match_id, p_registration: parsed.data.registration_id,
    p_reason: parsed.data.reason, p_evidence: evidence }, { success: "Contestação enviada ao organizador." });
}

export async function resolveDispute(disputeId: string, accept: boolean, resolution: string) {
  return callRpc("resolve_dispute", { p_dispute: disputeId, p_accept: accept, p_resolution: resolution },
    { success: accept ? "Contestação aceita. Ajuste os resultados se necessário." : "Contestação recusada." });
}
