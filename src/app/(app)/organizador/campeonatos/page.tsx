import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DemoBadge, EmptyState, PageHeader, StatusBadge } from "@/components/shared/ui-bits";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, modeLabel } from "@/lib/format";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Meus campeonatos (organizador)" };

export default async function OrganizerTournaments() {
  const { org } = await requireOrganizer();
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments")
    .select("*, registrations:tournament_registrations(count)")
    .eq("organizer_id", org.id).in("registrations.status", ["pending", "confirmed"])
    .order("created_at", { ascending: false });
  const list = (data ?? []) as (Tournament & { registrations: { count: number }[] })[];
  return (
    <div className="grid gap-6">
      <PageHeader title="Campeonatos" description={`${list.length} no total`} actions={<Link href="/organizador/novo" className={buttonVariants()}><Plus /> Criar campeonato</Link>} />
      {list.length ? (
        <ul className="divide-y rounded-3xl bg-card">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/organizador/campeonatos/${t.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">{t.name} {t.is_demo && <DemoBadge />} {t.hidden_by_admin && <span className="text-xs text-destructive">(oculto pela moderação)</span>}</p>
                  <p className="text-xs text-muted-foreground">{modeLabel[t.mode]} · {formatDateTime(t.starts_at)} · {t.registrations?.[0]?.count ?? 0}/{t.max_teams} equipes</p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Trophy} title="Nenhum campeonato criado" action={<Link href="/organizador/novo" className={buttonVariants()}>Criar o primeiro</Link>} />}
    </div>
  );
}
