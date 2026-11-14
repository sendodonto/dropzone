import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, DemoBadge, PageHeader } from "@/components/shared/ui-bits";
import { SearchBox } from "@/app/(site)/equipes/search-box";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Equipes · Admin" };

export default async function AdminTeams({ searchParams }: PageProps<"/admin/equipes">) {
  const { q } = (await searchParams) as { q?: string };
  const supabase = await createClient();
  let query = supabase.from("teams").select("id, name, tag, slug, logo_url, is_demo, created_at, captain:profiles!teams_captain_id_fkey(username), members:team_members(count), registrations:tournament_registrations(count)")
    .order("created_at", { ascending: false }).limit(150);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%_,()]/g, "")}%,tag.ilike.%${q.replace(/[%_,()]/g, "")}%`);
  const { data } = await query;
  type T = { id: string; name: string; tag: string; slug: string; logo_url: string | null; is_demo: boolean; created_at: string; captain: { username: string }; members: { count: number }[]; registrations: { count: number }[] };
  return (
    <div className="grid gap-4">
      <PageHeader title="Equipes" description="Moderação de equipes é feita por denúncias e pela suspensão das contas envolvidas." />
      <SearchBox placeholder="Buscar por nome ou tag" defaultValue={q} />
      <ul className="divide-y rounded-3xl bg-card">
        {((data ?? []) as unknown as T[]).map((t) => (
          <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
            <Avatar src={t.logo_url} name={t.name} size="sm" />
            <Link href={`/equipes/${t.slug}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary-text">{t.name} <span className="text-muted-foreground">[{t.tag}]</span> {t.is_demo && <DemoBadge />}</Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">cap. @{t.captain?.username} · {t.members?.[0]?.count ?? 0} membros · {t.registrations?.[0]?.count ?? 0} inscrições · {formatDate(t.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
