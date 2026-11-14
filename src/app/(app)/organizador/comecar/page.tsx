import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCog, KeyRound, ListOrdered } from "lucide-react";
import { PageHeader } from "@/components/shared/ui-bits";
import { requireViewer } from "@/lib/auth";
import { OrganizerForm } from "@/components/organizer/organizer-form";
import { createOrganizer } from "@/lib/actions/tournaments";

export const metadata: Metadata = { title: "Tornar-se organizador" };

export default async function BecomeOrganizerPage() {
  const viewer = await requireViewer();
  if (viewer.organizers.length) redirect("/organizador");
  return (
    <div className="grid max-w-3xl gap-8">
      <PageHeader title="Organize seus campeonatos" description="Crie seu perfil de organizador. Você continua podendo jogar normalmente." />
      <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
        {[[CalendarCog, "Assistente de criação", "Regras, pontuação e premiação em etapas."], [KeyRound, "Salas protegidas", "ID e senha liberados só para quem pode ver."], [ListOrdered, "Classificação automática", "Pontuação e desempate calculados sozinhos."]].map(([Icon, t, d]) => {
          const I = Icon as typeof CalendarCog;
          return (
            <li key={t as string} className="border-t pt-4">
              <I className="size-5 text-primary-text" aria-hidden />
              <p className="mt-2 font-medium">{t as string}</p>
              <p className="text-sm text-muted-foreground">{d as string}</p>
            </li>
          );
        })}
      </ul>
      <div className="rounded-3xl bg-card p-5"><OrganizerForm action={createOrganizer} submitLabel="Criar perfil de organizador" /></div>
    </div>
  );
}
