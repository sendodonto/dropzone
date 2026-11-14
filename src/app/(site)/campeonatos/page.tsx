import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TournamentCard } from "@/components/tournament/tournament-card";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Filters } from "./filters";
import { listTournaments, type TournamentFilters } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Campeonatos", description: "Encontre campeonatos de Free Fire com inscrições abertas." };

const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export default async function MarketplacePage({ searchParams }: PageProps<"/campeonatos">) {
  const sp = (await searchParams) as Record<string, string | undefined>;
  const filters: TournamentFilters = {
    q: sp.q?.slice(0, 60),
    status: pick(sp.status, ["open", "live", "finished", "upcoming"] as const),
    price: pick(sp.price, ["free", "paid"] as const),
    mode: pick(sp.mode, ["squad", "duo", "solo"] as const),
    prize: pick(sp.prize, ["with", "100", "1000"] as const),
    slots: pick(sp.slots, ["available"] as const),
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from : undefined,
    organizer: /^[0-9a-f-]{36}$/.test(sp.org ?? "") ? sp.org : undefined,
  };
  const supabase = await createClient();
  const [list, { data: orgs }] = await Promise.all([
    listTournaments(filters),
    supabase.from("organizers").select("id, name").eq("status", "approved").order("name").limit(100),
  ]);
  const active = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title="Campeonatos" description={`${list.length} resultado${list.length === 1 ? "" : "s"}${active ? " com os filtros aplicados" : ""}`} />
      <Filters current={sp} organizers={orgs ?? []} />
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <TournamentCard key={t.id} t={t} />)}
        </div>
      ) : (
        <EmptyState icon={SearchX} title="Nenhum campeonato encontrado" description="Tente remover alguns filtros."
          action={<Link href="/campeonatos" className={buttonVariants({ variant: "outline" })}>Limpar filtros</Link>} />
      )}
    </div>
  );
}
