import "server-only";
import type { z } from "zod";
import type { ActionResult } from "@/lib/types";

/** Turns a Postgres/PostgREST error into a message safe to show users. */
export function dbError(error: { message?: string; code?: string } | null | undefined): ActionResult<never> {
  const msg = error?.message ?? "Erro inesperado.";
  if (error?.code === "23505") return { ok: false, message: "Esse registro já existe." };
  if (error?.code === "42501" && !/[áéíóúãç]/i.test(msg)) return { ok: false, message: "Você não tem permissão para isso." };
  if (error?.code === "PGRST116") return { ok: false, message: "Registro não encontrado." };
  // Messages raised by our RPCs are written in Portuguese for end users.
  return { ok: false, message: msg.length < 300 ? msg : "Não foi possível concluir a ação." };
}

export function invalid(err: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(issue.message);
  }
  return { ok: false, message: err.issues[0]?.message ?? "Dados inválidos.", fieldErrors };
}

export function formObject(fd: FormData) {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key);
    out[key] = key.endsWith("[]") ? all : all[0];
  }
  return out;
}

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Calls a Postgres RPC (which enforces permissions) and revalidates pages. */
export async function callRpc(
  fn: string,
  args: Record<string, unknown>,
  opts: { success?: string; revalidate?: string[] } = {},
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return dbError(error);
  for (const p of opts.revalidate ?? ["/"]) revalidatePath(p, "layout");
  return { ok: true, message: opts.success, data };
}
