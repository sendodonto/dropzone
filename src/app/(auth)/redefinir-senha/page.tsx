import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { updatePassword } from "@/lib/actions/auth";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in via /auth/confirm before landing here.
  if (!(await getViewer())) redirect("/entrar?erro=link");
  return (
    <>
      <h1 className="font-heading text-2xl font-bold">Criar nova senha</h1>
      <ActionForm action={updatePassword} className="mt-6">
        <Field name="password" label="Nova senha" type="password" autoComplete="new-password" required minLength={8} />
        <Field name="confirm" label="Confirmar senha" type="password" autoComplete="new-password" required minLength={8} />
        <SubmitButton size="lg" className="w-full">Salvar senha</SubmitButton>
      </ActionForm>
    </>
  );
}
