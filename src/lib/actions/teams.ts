"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { teamSchema, username } from "@/lib/validation";
import { callRpc, dbError, formObject, invalid } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";

const id = z.uuid();
const paths = ["/painel", "/equipes"];

export async function createTeam(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = teamSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("create_team", {
    p_name: parsed.data.name, p_tag: parsed.data.tag, p_description: parsed.data.description,
  });
  if (error) return dbError(error);
  if (parsed.data.logo_url) await supabase.from("teams").update({ logo_url: parsed.data.logo_url }).eq("id", teamId);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Squad criado!", redirectTo: `/painel/squads/${teamId}` };
}

export async function updateTeam(teamId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  if (!id.safeParse(teamId).success) return { ok: false, message: "Squad inválido." };
  const parsed = teamSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase.from("teams").update(parsed.data, { count: "exact" }).eq("id", teamId);
  if (error) return dbError(error);
  if (!count) return { ok: false, message: "Apenas o capitão pode editar o squad." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Squad atualizado." };
}

export async function inviteMember(teamId: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const u = username.safeParse(fd.get("username"));
  if (!u.success) return invalid(u.error);
  return callRpc("invite_to_team", { p_team: teamId, p_username: u.data }, { success: "Convite enviado.", revalidate: paths });
}

export async function respondInvite(inviteId: string, accept: boolean) {
  return callRpc("respond_team_invite", { p_invite: inviteId, p_accept: accept },
    { success: accept ? "Você entrou no squad!" : "Convite recusado.", revalidate: paths });
}

export async function cancelInvite(inviteId: string) {
  return callRpc("cancel_team_invite", { p_invite: inviteId }, { success: "Convite cancelado.", revalidate: paths });
}

export async function removeMember(teamId: string, userId: string) {
  return callRpc("remove_team_member", { p_team: teamId, p_user: userId }, { success: "Integrante removido.", revalidate: paths });
}

export async function leaveTeam(teamId: string) {
  const r = await callRpc("leave_team", { p_team: teamId }, { success: "Você saiu do squad.", revalidate: paths });
  return r.ok ? { ...r, redirectTo: "/painel/squads" } : r;
}

export async function transferCaptain(teamId: string, userId: string) {
  return callRpc("transfer_team_captaincy", { p_team: teamId, p_new_captain: userId }, { success: "Liderança transferida.", revalidate: paths });
}

export async function deleteTeam(teamId: string) {
  const r = await callRpc("delete_team", { p_team: teamId }, { success: "Squad excluído.", revalidate: paths });
  return r.ok ? { ...r, redirectTo: "/painel/squads" } : r;
}
