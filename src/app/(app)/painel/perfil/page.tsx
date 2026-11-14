import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/ui-bits";
import { requireViewer } from "@/lib/auth";
import { ProfileForm } from "./profile-form";
import { AdultConfirm } from "@/components/wagers/wager-forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  return (
    <div className="grid max-w-2xl gap-8">
      <PageHeader title="Perfil" description={viewer.email ?? undefined}
        actions={viewer.profile.username && <Link href={`/jogadores/${viewer.profile.username}`} className={buttonVariants({ variant: "outline" })}><ExternalLink /> Ver perfil público</Link>} />
      <div className="rounded-3xl bg-card p-5"><ProfileForm profile={viewer.profile} /></div>
      {viewer.profile.adult_confirmed_at ? (
        <p className="text-sm text-muted-foreground">Maioridade confirmada: você pode jogar apostados.</p>
      ) : <AdultConfirm />}
      <p className="text-sm text-muted-foreground">
        Para alterar a senha, use <Link href="/recuperar-senha" className="text-primary-text hover:underline">recuperar senha</Link>.
      </p>
    </div>
  );
}
