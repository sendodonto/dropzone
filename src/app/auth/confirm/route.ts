import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles email confirmation, password recovery and PKCE code links.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/painel";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/painel";
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  // Supabase sends errors back as query params (e.g. error_code=otp_expired) when the link itself failed.
  if (searchParams.get("error_code") || searchParams.get("error")) return to("/entrar?erro=link");

  const supabase = await createClient();
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    return to(error ? "/entrar?erro=link" : next);
  }
  if (!code) return to("/entrar?erro=link");

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return to(next);
  // PKCE: the code verifier lives in the browser that started the flow. Opened elsewhere (another browser,
  // the phone's mail app), Supabase has already confirmed the email but no session can be created here.
  if (error.code === "pkce_code_verifier_not_found")
    return to(next === "/redefinir-senha" ? "/recuperar-senha?erro=navegador" : "/entrar?confirmado=1");
  return to("/entrar?erro=link");
}
