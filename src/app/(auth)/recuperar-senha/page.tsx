import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/recuperar-senha">) {
  const { erro } = (await searchParams) as { erro?: string };
  return (
    <>
      <h1 className="font-heading text-2xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para você criar uma nova senha.</p>
      {erro === "navegador" && (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          O link foi aberto em outro navegador ou aparelho. Peça um novo link e abra o email no mesmo navegador em que fez o pedido.
        </p>
      )}
      <ActionForm action={requestPasswordReset} className="mt-6" resetOnSuccess>
        <Field name="email" label="Email" type="email" autoComplete="email" required />
        <SubmitButton size="lg" className="w-full">Enviar link</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm"><Link href="/entrar" className="text-muted-foreground hover:text-primary-text">Voltar para o login</Link></p>
    </>
  );
}
