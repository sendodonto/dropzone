import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/ui-bits";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { createClient } from "@/lib/supabase/server";
import { updatePlan } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Planos · Admin" };

export default async function AdminPlans() {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("sort_order");
  return (
    <div className="grid gap-6">
      <PageHeader title="Planos" description="Limites valem imediatamente. Cobrança de assinatura só funciona após integração financeira (Configurações → cobrança de assinaturas)." />
      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((p: { id: string; code: string; name: string; price_cents: number; max_active_tournaments: number; max_teams_per_tournament: number }) => (
          <div key={p.id} className="rounded-3xl bg-card p-4">
            <p className="mb-3 font-heading text-xl font-bold">{p.name} <span className="text-sm font-normal text-muted-foreground">({p.code})</span></p>
            <ActionForm action={updatePlan}>
              <input type="hidden" name="code" value={p.code} />
              <Field name="price" label="Preço mensal (R$)" type="number" min={0} step="0.01" defaultValue={p.price_cents / 100} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="max_active" label="Campeonatos ativos" type="number" min={1} defaultValue={p.max_active_tournaments} />
                <Field name="max_teams" label="Máx. equipes/campeonato" type="number" min={2} max={100} defaultValue={p.max_teams_per_tournament} />
              </div>
              <SubmitButton className="justify-self-start">Salvar</SubmitButton>
            </ActionForm>
          </div>
        ))}
      </div>
    </div>
  );
}
