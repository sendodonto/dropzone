import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { AdultConfirm, CreateWagerForm } from "@/components/wagers/wager-forms";
import { requireViewer } from "@/lib/auth";
import { getCaptainTeams, getWagerSettings } from "@/lib/wager-queries";

export const metadata: Metadata = { title: "Criar apostado" };

export default async function NewWagerPage() {
  const viewer = await requireViewer();
  const [settings, teams] = await Promise.all([getWagerSettings(), getCaptainTeams(viewer.id)]);
  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title="Criar apostado" description="Defina o desafio. Quando alguém aceitar, os dois lados fazem o Pix ao mediador e a sala é liberada." />
      {!settings.enabled ? (
        <p className="rounded-2xl bg-warning/10 p-4 text-sm">Os apostados estão pausados no momento.</p>
      ) : !viewer.profile.adult_confirmed_at ? (
        <AdultConfirm />
      ) : (
        <div className="rounded-3xl bg-card p-5 sm:p-6">
          <CreateWagerForm teams={teams} meId={viewer.id} feePercent={settings.feePercent} />
        </div>
      )}
    </div>
  );
}
