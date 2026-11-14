import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { signIn } from "@/lib/actions/auth";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next, erro, confirmado } = (await searchParams) as { next?: string; erro?: string; confirmado?: string };
  if (await getViewer()) redirect(next?.startsWith("/") ? next : "/painel");
  return (
    <>
      <h1 className="font-heading text-2xl font-bold">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bem-vindo de volta. Seu squad está esperando.</p>
      {confirmado && <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm" role="status">Email confirmado! Entre com seu email e senha para continuar.</p>}
      {erro && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">Esse link expirou ou já foi usado. Se você já confirmou o email, é só entrar abaixo.</p>}
      <ActionForm action={signIn} className="mt-6">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field name="email" label="Email" type="email" autoComplete="email" required />
        <Field name="password" label="Senha" type="password" autoComplete="current-password" required />
        <Link href="/recuperar-senha" className="-mt-2 justify-self-end text-xs text-muted-foreground hover:text-primary-text">Esqueci minha senha</Link>
        <SubmitButton size="lg" className="w-full">Entrar</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Novo por aqui? <Link href="/cadastro" className="font-medium text-primary-text hover:underline">Criar conta</Link>
      </p>
    </>
  );
}
