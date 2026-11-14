import type { Metadata } from "next";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, PageHeader, Section } from "@/components/shared/ui-bits";
import { OrganizerForm } from "@/components/organizer/organizer-form";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateOrganizer } from "@/lib/actions/tournaments";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Perfil do organizador" };

export default async function OrganizerProfilePage() {
  const { org } = await requireOrganizer();
  const supabase = await createClient();
  const [{ data: plan }, { data: members }] = await Promise.all([
    org.plan_id ? supabase.from("plans").select("*").eq("id", org.plan_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("organizer_members").select("role, user:profiles(username, display_name, avatar_url)").eq("organizer_id", org.id),
  ]);
  return (
    <div className="grid gap-10">
      <PageHeader title="Perfil e plano" actions={<Link href={`/organizadores/${org.slug}`} className={buttonVariants({ variant: "outline" })}><ExternalLink /> Página pública</Link>} />
      <div className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <Section title="Dados do organizador">
          <div className="rounded-3xl bg-card p-5"><OrganizerForm action={updateOrganizer.bind(null, org.id)} org={org} submitLabel="Salvar" /></div>
        </Section>
        <div className="grid content-start gap-10">
          <Section title="Plano atual">
            <div className="rounded-3xl bg-card p-5">
              <p className="font-heading text-2xl font-bold">{plan?.name ?? "Free"}</p>
              <p className="text-sm text-muted-foreground">{plan?.price_cents ? `${formatMoney(plan.price_cents)}/mês` : "Gratuito"} · até {plan?.max_active_tournaments ?? 3} campeonatos ativos</p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {((plan?.features ?? []) as string[]).map((f) => <li key={f} className="flex gap-2"><Check className="size-4 text-primary-text" aria-hidden />{f}</li>)}
              </ul>
              <Link href="/planos" className={buttonVariants({ variant: "outline", className: "mt-4" })}>Comparar planos</Link>
            </div>
          </Section>
          <Section title="Equipe de staff">
            <ul className="divide-y rounded-3xl bg-card">
              {((members ?? []) as unknown as { role: string; user: { username: string; display_name: string; avatar_url: string | null } }[]).map((m) => (
                <li key={m.user.username} className="flex items-center gap-3 p-3 text-sm">
                  <Avatar src={m.user.avatar_url} name={m.user.display_name} size="sm" rounded />
                  <span className="flex-1">{m.user.display_name} <span className="text-muted-foreground">@{m.user.username}</span></span>
                  <span className="text-xs text-muted-foreground">{m.role === "owner" ? "Dono" : "Staff"}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
