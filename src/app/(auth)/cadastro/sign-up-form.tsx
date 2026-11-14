"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ActionForm, Field, FieldError, SubmitButton } from "@/components/shared/action-form";
import { signUp } from "@/lib/actions/auth";

export function SignUpForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  if (sentTo)
    return (
      <div className="mt-6 grid gap-3 rounded-xl bg-primary/10 p-4 text-sm" role="status">
        <MailCheck className="size-6 text-primary-text" aria-hidden />
        <p>Enviamos um link de confirmação para <strong>{sentTo}</strong>. Abra o email para ativar sua conta.</p>
      </div>
    );

  return (
    <ActionForm action={signUp} className="mt-6" onSuccess={(r) => r.ok && (r.data as { needsConfirmation?: boolean })?.needsConfirmation && setSentTo(email)}>
      <Field name="display_name" label="Nome" autoComplete="name" required maxLength={40} />
      <Field name="username" label="Username" autoComplete="username" required maxLength={20} hint="3–20 letras minúsculas, números ou _"
        onChange={(e) => (e.currentTarget.value = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
      <Field name="email" label="Email" type="email" autoComplete="email" required onChange={(e) => setEmail(e.currentTarget.value)} />
      <Field name="password" label="Senha" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo 8 caracteres, com letras e números" />
      <div className="grid gap-1">
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--primary)]" required />
          <span>Li e aceito os <Link href="/termos" className="text-primary-text hover:underline" target="_blank">termos de uso</Link> e a <Link href="/privacidade" className="text-primary-text hover:underline" target="_blank">política de privacidade</Link>.</span>
        </label>
        <FieldError name="terms" />
      </div>
      <SubmitButton size="lg" className="w-full">Criar conta</SubmitButton>
    </ActionForm>
  );
}
