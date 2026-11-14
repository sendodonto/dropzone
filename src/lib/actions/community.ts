"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reportSchema } from "@/lib/validation";
import { callRpc, dbError, formObject, invalid } from "@/lib/actions/helpers";
import type { ActionResult, ReportStatus } from "@/lib/types";

export async function markNotificationsRead(ids?: string[]) {
  return callRpc("mark_notifications_read", { p_ids: ids ?? null }, { revalidate: ["/painel"] });
}

export async function createReport(_: unknown, fd: FormData): Promise<ActionResult> {
  const obj = formObject(fd);
  const evidence = String(obj.evidence ?? "").split(/\s+/).filter((u) => /^https?:\/\//.test(u));
  const parsed = reportSchema.safeParse({ ...obj, evidence_urls: [...evidence, ...((obj["uploads[]"] as string[]) ?? [])] });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert(parsed.data);
  if (error) return dbError(error);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Denúncia enviada. Você será notificado sobre a decisão." };
}

export async function resolveReport(reportId: string, status: ReportStatus, decision: string) {
  return callRpc("resolve_report", { p_report: reportId, p_status: status, p_decision: decision },
    { success: "Denúncia atualizada.", revalidate: ["/admin", "/organizador"] });
}
