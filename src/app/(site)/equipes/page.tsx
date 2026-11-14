import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar, DemoBadge, EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Equipes" };

export default async function TeamsPage({ searchParams }: PageProps<"/equipes">) {
  const { q } = (await searchParams) as { q?: string };
  const supabase = await createClient();
  let query = supabase.from("teams").select("id, name, tag, slug, logo_url, is_demo, members:team_members(count)").order("name").limit(96);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%_,()]/g, "")}%,tag.ilike.%${q.replace(/[%_,()]/g, "")}%`);
  const { data } = await query;
  const teams = (data ?? []) as unknown as { id: string; name: string; tag: string; slug: string; logo_url: string | null; is_demo: boolean; members: { count: number }[] }[];
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title="Equipes" description="Squads cadastrados na plataforma." />
      <SearchBox placeholder="Buscar por nome ou tag" defaultValue={q} />
      {teams.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((t) => (
            <li key={t.id}>
              <Link href={`/equipes/${t.slug}`} className="flex items-center gap-3 rounded-3xl bg-card p-3 hover:border-primary/40">
                <Avatar src={t.logo_url} name={t.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">[{t.tag}] · {t.members?.[0]?.count ?? 0} integrantes {t.is_demo && <DemoBadge />}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Users} title="Nenhuma equipe encontrada" />}
    </div>
  );
}
