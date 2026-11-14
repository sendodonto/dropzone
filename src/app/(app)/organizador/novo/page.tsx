import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { TournamentWizard } from "@/components/organizer/tournament-wizard";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Criar campeonato" };

export default async function NewTournamentPage() {
  const { org } = await requireOrganizer();
  const supabase = await createClient();
  const [{ data }, { data: seasons }] = await Promise.all([
    supabase.from("platform_settings").select("value").eq("key", "payments_enabled").maybeSingle(),
    supabase.from("seasons").select("id, name").gte("ends_at", new Date().toISOString().slice(0, 10)).order("starts_at"),
  ]);
  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader meta={org.name} title="Criar campeonato" description="Seis etapas rápidas. Você pode salvar como rascunho e publicar depois." />
      {org.status !== "approved" && (
        <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">Seu perfil de organizador ainda não foi aprovado: você pode criar rascunhos, mas só poderá publicar após a aprovação.</p>
      )}
      <div className="rounded-3xl bg-card p-4 sm:p-6">
        <TournamentWizard organizerId={org.id} organizerName={org.name} paymentsEnabled={data?.value === true} seasons={seasons ?? []} />
      </div>
    </div>
  );
}
