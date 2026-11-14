"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { callRpc, dbError, formObject, invalid } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";

// Every function here is re-checked in Postgres (assert_admin / RLS is_admin()).
const r = ["/admin"];

export async function setUserStatus(userId: string, status: "active" | "suspended" | "banned", reason?: string) {
  return callRpc("admin_set_user_status", { p_user: userId, p_status: status, p_reason: reason || null },
    { success: { active: "Conta reativada.", suspended: "Conta suspensa.", banned: "Conta banida." }[status], revalidate: r });
}

export async function setUserRole(userId: string, grant: boolean) {
  return callRpc("admin_set_role", { p_user: userId, p_role: "admin", p_grant: grant },
    { success: grant ? "Acesso de administrador concedido." : "Acesso removido.", revalidate: r });
}

export async function setOrganizerStatus(orgId: string, status: "pending" | "approved" | "suspended", reason?: string) {
  return callRpc("admin_set_organizer_status", { p_org: orgId, p_status: status, p_reason: reason || null },
    { success: "Organizador atualizado.", revalidate: r });
}

export async function setOrganizerPlan(orgId: string, plan: string) {
  return callRpc("admin_set_organizer_plan", { p_org: orgId, p_plan_code: plan }, { success: "Plano alterado.", revalidate: r });
}

export async function moderateTournament(id: string, hidden: boolean, featured: boolean, reason?: string) {
  return callRpc("admin_moderate_tournament", { p_tournament: id, p_hidden: hidden, p_featured: featured, p_reason: reason || null },
    { success: "Campeonato atualizado." });
}

export async function reviewPaidRequest(id: string, approve: boolean, note?: string) {
  return callRpc("admin_review_paid_request", { p_tournament: id, p_approve: approve, p_note: note || null },
    { success: approve ? "Inscrição paga habilitada." : "Solicitação recusada.", revalidate: r });
}

export async function setSetting(key: string, value: unknown) {
  return callRpc("admin_set_setting", { p_key: key, p_value: value }, { success: "Configuração salva.", revalidate: ["/"] });
}

export async function updatePlan(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    code: z.string().min(1),
    price: z.coerce.number().min(0).max(10000),
    max_active: z.coerce.number().int().min(1).max(1000),
    max_teams: z.coerce.number().int().min(2).max(100),
  }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return callRpc("admin_update_plan", { p_code: parsed.data.code, p_price_cents: Math.round(parsed.data.price * 100),
    p_max_active: parsed.data.max_active, p_max_teams: parsed.data.max_teams }, { success: "Plano atualizado.", revalidate: r });
}

export async function createSeason(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    name: z.string().trim().min(3).max(60),
    starts_at: z.iso.date("Data inicial inválida."),
    ends_at: z.iso.date("Data final inválida."),
    rewards_description: z.string().trim().max(500).optional(),
  }).refine((v) => v.ends_at >= v.starts_at, { message: "A data final deve ser após a inicial.", path: ["ends_at"] })
    .safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const slug = parsed.data.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { error } = await supabase.from("seasons").insert({ ...parsed.data, slug: `${slug}-${Date.now().toString(36)}` });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Temporada criada." };
}

export async function awardSeasonChampions(seasonId: string) {
  return callRpc("award_season_champions", { p_season: seasonId }, { success: "Distintivos de campeão concedidos." });
}

export async function recordPaymentStatus(paymentId: string, status: string, note?: string) {
  return callRpc("record_payment_status", { p_payment: paymentId, p_status: status, p_source: "admin", p_note: note ?? "" },
    { success: "Status registrado com trilha de auditoria.", revalidate: r });
}
