import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crosshair, Crown, ListOrdered, Medal, Target, Trophy } from "lucide-react";
import { Avatar, DemoBadge, PageHeader, Section, StatGroup, StatTile } from "@/components/shared/ui-bits";
import { ReportDialog } from "@/components/tournament/dialogs";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPoints } from "@/lib/format";
import type { Team } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/equipes/[slug]">): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("name, tag").eq("slug", (await params).slug).maybeSingle();
  return { title: data ? `${data.name} [${data.tag}]` : "Equipe" };
}

export default async function TeamPublicPage({ params }: PageProps<"/equipes/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("*").eq("slug", slug).maybeSingle<Team>();
  if (!team) notFound();
  const [viewer, summary, { data: members }, { data: regs }] = await Promise.all([
    getViewer(),
    supabase.rpc("get_team_summary", { p_team: team.id }).single(),
    supabase.from("team_members").select("role, user:profiles(username, display_name, avatar_url)").eq("team_id", team.id).order("joined_at"),
    supabase.from("tournament_registrations").select("id, final_rank, status, tournament:tournaments(name, slug, starts_at, status)")
      .eq("team_id", team.id).in("status", ["confirmed"]).order("created_at", { ascending: false }),
  ]);
  const s = (summary.data ?? {}) as { tournaments?: number; titles?: number; wins?: number; kills?: number; points?: number; avg_placement?: number };
  const history = ((regs ?? []) as unknown as { id: string; final_rank: number | null; tournament: { name: string; slug: string; starts_at: string; status: string } }[]).filter((r) => r.tournament);
  const titles = history.filter((h) => h.final_rank === 1);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={team.logo_url} name={team.name} size="xl" />
        <div className="min-w-0 flex-1">
          <PageHeader meta={<span className="inline-flex items-center gap-2">[{team.tag}] {team.is_demo && <DemoBadge />}</span>} title={team.name} description={team.description ?? undefined} />
        </div>
        {viewer && <ReportDialog targetType="team" targetId={team.id} />}
      </div>

      <StatGroup className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Campeonatos" value={s.tournaments ?? 0} icon={Trophy} />
        <StatTile label="Títulos" value={s.titles ?? 0} icon={Crown} />
        <StatTile label="Booyahs" value={s.wins ?? 0} icon={Target} />
        <StatTile label="Abates" value={s.kills ?? 0} icon={Crosshair} />
        <StatTile label="Pontos" value={formatPoints(s.points)} icon={Medal} />
        <StatTile label="Posição média" value={s.avg_placement ?? "—"} icon={ListOrdered} />
      </StatGroup>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Section title="Integrantes">
          <ul className="divide-y rounded-3xl bg-card">
            {((members ?? []) as unknown as { role: string; user: { username: string; display_name: string; avatar_url: string | null } }[]).map((m) => (
              <li key={m.user.username}>
                <Link href={`/jogadores/${m.user.username}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                  <Avatar src={m.user.avatar_url} name={m.user.display_name} rounded />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.user.display_name}</p><p className="text-xs text-muted-foreground">@{m.user.username}</p></div>
                  {m.role === "captain" && <span className="inline-flex items-center gap-1 text-xs text-primary-text"><Crown className="size-3" aria-hidden /> Capitão</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        <div className="grid content-start gap-10">
          {titles.length > 0 && (
            <Section title="Conquistas">
              <ul className="flex flex-wrap gap-2">
                {titles.map((t) => (
                  <li key={t.id}><Link href={`/campeonatos/${t.tournament.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm"><Trophy className="size-4 text-primary-text" aria-hidden />{t.tournament.name}</Link></li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="Campeonatos disputados">
            {history.length ? (
              <ul className="divide-y rounded-3xl bg-card">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/campeonatos/${h.tournament.slug}?tab=classificacao`} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/40">
                      <span className="min-w-0 flex-1 truncate">{h.tournament.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.tournament.starts_at)}</span>
                      <span className="w-10 text-right font-heading font-bold">{h.final_rank ? `#${h.final_rank}` : "—"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nenhum campeonato disputado ainda.</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}
