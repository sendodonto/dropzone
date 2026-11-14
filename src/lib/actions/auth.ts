"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrganizingOpen } from "@/lib/auth";
import { onboardingSchema, profileSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { dbError, formObject, invalid } from "@/lib/actions/helpers";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/painel";
}

export async function signUp(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: taken } = await supabase.from("profiles").select("id").eq("username", parsed.data.username).maybeSingle();
  if (taken) return { ok: false, message: "Esse username já está em uso.", fieldErrors: { username: ["Esse username já está em uso."] } };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/confirm?next=/onboarding`,
      data: { username: parsed.data.username, display_name: parsed.data.display_name },
    },
  });
  if (error) {
    if (/already registered/i.test(error.message)) return { ok: false, message: "Já existe uma conta com esse email." };
    if (/password/i.test(error.message)) return { ok: false, message: "Senha fraca demais. Use letras, números e 8+ caracteres." };
    return { ok: false, message: "Não foi possível criar a conta. Tente novamente." };
  }
  if (!data.session) return { ok: true, message: "Conta criada! Confirme pelo link enviado ao seu email.", data: { needsConfirmation: true } };
  redirect("/onboarding");
}

export async function signIn(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/not confirmed/i.test(error.message)) return { ok: false, message: "Confirme seu email antes de entrar." };
    return { ok: false, message: "Email ou senha incorretos." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(_: unknown, fd: FormData): Promise<ActionResult> {
  const email = z.email("Email inválido.").safeParse(String(fd.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return invalid(email.error);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await origin()}/auth/confirm?next=/redefinir-senha` });
  // Same answer whether or not the email exists (no account enumeration).
  return { ok: true, message: "Se o email estiver cadastrado, você receberá um link para redefinir a senha." };
}

export async function updatePassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.shape.password.safeParse(fd.get("password"));
  if (!parsed.success) return invalid(parsed.error);
  if (fd.get("password") !== fd.get("confirm")) return { ok: false, message: "As senhas não coincidem." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { ok: false, message: "Link expirado. Solicite uma nova redefinição." };
  redirect("/painel");
}

export async function completeOnboarding(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_username: d.username, p_display_name: d.display_name, p_ff_id: d.ff_id ?? "",
    p_region: d.region, p_mode: d.preferred_mode, p_intent: d.intent,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect(d.intent === "organize" && (await getOrganizingOpen()) ? "/organizador/comecar" : "/painel");
}

export async function updateProfile(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: "Sessão expirada." };
  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ username: d.username, display_name: d.display_name, ff_id: d.ff_id || null, region: d.region,
      preferred_mode: d.preferred_mode, bio: d.bio, avatar_url: d.avatar_url })
    .eq("id", auth.user.id);
  if (error) return error.code === "23505" ? { ok: false, message: "Esse username já está em uso." } : dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil atualizado." };
}
