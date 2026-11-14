"use server";
import { z } from "zod";
import { callRpc, invalid } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";
import { composeRules } from "@/lib/wager-rules";

const roster = (fd: FormData) => ({
  team: String(fd.get("team_id") || "") || null,
  players: fd.getAll("players[]").map(String),
});

export async function confirmAdult(_: unknown, fd: FormData): Promise<ActionResult> {
  const d = z.iso.date("Informe sua data de nascimento.").safeParse(String(fd.get("birthdate") ?? ""));
  if (!d.success) return invalid(d.error);
  return callRpc("confirm_adult", { p_birthdate: d.data }, { success: "Maioridade confirmada." });
}

const createSchema = z.object({
  team_size: z.coerce.number().int().min(1).max(4),
  stake: z.coerce.number({ error: "Informe o valor." }).min(1, "Mínimo R$ 1,00 por jogador.").max(500, "Máximo R$ 500,00 por jogador."),
  rounds: z.coerce.number().refine((n) => [1, 3, 5].includes(n), "Formato inválido."),
  map: z.string().trim().min(2).max(30),
  weapon: z.string().optional().default("livre"),
  gel: z.string().optional().default("normal"),
});

export async function createWager(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = createSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const r = roster(fd);
  const res = await callRpc("create_wager", {
    p_team_size: d.team_size, p_stake_cents: Math.round(d.stake * 100), p_rounds: d.rounds, p_map: d.map,
    p_rules: composeRules(d.weapon, d.gel, fd.getAll("toggles[]").map(String)), p_team: d.team_size > 1 ? r.team : null, p_players: r.players,
  }, { success: "Apostado criado! Agora é só esperar alguém aceitar." });
  return res.ok ? { ...res, redirectTo: `/apostados/${res.data}` } : res;
}

export async function acceptWager(wagerId: string, teamSize: number, _: unknown, fd: FormData): Promise<ActionResult> {
  const r = roster(fd);
  return callRpc("accept_wager", { p_wager: wagerId, p_team: teamSize > 1 ? r.team : null, p_players: r.players },
    { success: "Apostado aceito! Agora os dois lados fazem o Pix." });
}

export async function cancelWager(wagerId: string) {
  return callRpc("cancel_wager", { p_wager: wagerId }, { success: "Apostado cancelado." });
}

export async function reportWager(wagerId: string, winner: "a" | "b") {
  return callRpc("report_wager", { p_wager: wagerId, p_winner: winner }, { success: "Resultado enviado." });
}

export async function setWagerRoom(wagerId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const code = z.string().trim().min(1, "Informe o ID da sala.").max(30).safeParse(String(fd.get("room_code") ?? ""));
  if (!code.success) return invalid(code.error);
  return callRpc("set_wager_room", { p_wager: wagerId, p_code: code.data, p_password: String(fd.get("room_password") ?? "") },
    { success: "Sala liberada para os dois lados." });
}

// ── Mediator (admin). Postgres re-checks admin on every call.
export async function markWagerPaid(wagerId: string, side: "a" | "b") {
  return callRpc("admin_mark_wager_paid", { p_wager: wagerId, p_side: side }, { success: `Pix do lado ${side.toUpperCase()} confirmado.` });
}

export async function resolveWager(wagerId: string, winner: "a" | "b", note?: string) {
  return callRpc("admin_resolve_wager", { p_wager: wagerId, p_winner: winner, p_note: note ?? "" }, { success: "Disputa decidida." });
}

export async function markWagerPayout(wagerId: string) {
  return callRpc("admin_mark_wager_payout", { p_wager: wagerId }, { success: "Pagamento ao vencedor registrado." });
}
