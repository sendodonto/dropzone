import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await getViewer()) redirect("/painel");
  return (
    <>
      <h1 className="font-heading text-2xl font-bold">Criar conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Grátis. Jogue, organize ou os dois.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta? <Link href="/entrar" className="font-medium text-primary-text hover:underline">Entrar</Link>
      </p>
    </>
  );
}
