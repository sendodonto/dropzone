import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { requireViewer } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Bem-vindo" };

export default async function OnboardingPage() {
  const viewer = await requireViewer({ allowIncompleteOnboarding: true });
  if (viewer.profile.onboarded) redirect("/painel");
  return (
    <main id="conteudo" className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="font-heading text-2xl font-bold">Configure seu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Último passo: leva menos de um minuto e você pode mudar tudo depois.</p>
          <OnboardingForm profile={viewer.profile} />
        </div>
      </div>
    </main>
  );
}
