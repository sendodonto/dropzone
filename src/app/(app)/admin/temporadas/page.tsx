import type { Metadata } from "next";
import { Crown } from "lucide-react";
import { DemoBadge, Section } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { createClient } from "@/lib/supabase/server";
import { awardSeasonChampions, createSeason } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Temporadas · Admin" };

export default async function AdminSeasons() {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*, tournaments(count)").order("starts_at", { ascending: false });
  type S = { id: string; name: string; starts_at: string; ends_at: string; rewards_description: string | null; is_demo: boolean; tournaments: { count: number }[] };
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <Section title="Temporadas">
        <ul className="divide-y rounded-3xl bg-card">
          {((data ?? []) as S[]).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name} {s.is_demo && <DemoBadge />}</p>
                <p className="text-xs text-muted-foreground">{formatDate(s.starts_at)} – {formatDate(s.ends_at)} · {s.tournaments?.[0]?.count ?? 0} campeonatos{s.rewards_description && ` · ${s.rewards_description}`}</p>
              </div>
              <ActionButton action={awardSeasonChampions.bind(null, s.id)} variant="outline" size="sm"
                confirm={{ title: `Encerrar ${s.name} e premiar campeões?`, description: "Os integrantes do squad nº 1 do ranking da temporada recebem o distintivo de Campeão de temporada." }}>
                <Crown /> Premiar campeões
              </ActionButton>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Organizadores vinculam campeonatos a uma temporada; o ranking da temporada usa só campeonatos finalizados.</p>
      </Section>
      <Section title="Nova temporada">
        <div className="rounded-3xl bg-card p-4">
          <ActionForm action={createSeason} resetOnSuccess>
            <Field name="name" label="Nome" required maxLength={60} placeholder="Temporada 2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="starts_at" label="Início" type="date" required />
              <Field name="ends_at" label="Fim" type="date" required />
            </div>
            <Field name="rewards_description" label="Recompensas" textarea rows={2} maxLength={500} hint="Somente recompensas legalmente permitidas." />
            <SubmitButton className="justify-self-start">Criar temporada</SubmitButton>
          </ActionForm>
        </div>
      </Section>
    </div>
  );
}
