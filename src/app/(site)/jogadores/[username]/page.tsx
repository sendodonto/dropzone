import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crosshair, Crown, Hash, ListOrdered, Target, Trophy } from "lucide-react";
import { Avatar, DemoBadge, PageHeader, Section, StatGroup, StatTile } from "@/components/shared/ui-bits";
import { AchievementGrid, type AchievementRow } from "@/components/shared/achievements";
import { ReportDialog } from "@/components/tournament/dialogs";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, modeLabel } from "@/lib/format";
import type { Profile } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/jogadores/[username]">): Promise<Metadata> {
  return { title: `@${(await params).username}` };
}

export default async function PlayerPage({ params }: PageProps<"/jogadores/[username]">) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle<Profile>();
  if (!p || p.status === "banned") notFound();
  const [viewer, summary, { data: teams }, { data: ach }, { data: history }] = await Promise.all([
    getViewer(),
    supabase.rpc("get_player_summary", { p_user: p.id }).single(),
    supabase.from("team_members").select("role, team:teams(name, tag, slug, logo_url)").eq("user_id", p.id),
    supabase.from("user_achievements").select("awarded_at, achievement:achievements(*)").eq("user_id", p.id).order("awarded_at", { ascending: false }),
    supabase.from("registration_players").select("registration:tournament_registrations(id, final_rank, team:teams(name), tournament:tournaments(name, slug, starts_at, status))").eq("user_id", p.id),
  ]);
  const s = (summary.data ?? {}) as { tournaments?: number; titles?: number; wins?: number; kills?: number; avg_placement?: number; ranking_position?: number };
  const hist = ((history ?? []) as unknown as { registration: { id: string; final_rank: number | null; team: { name: string }; tournament: { name: string; slug: string; starts_at: string; status: string } } | null }[])
    .map((h) => h.registration).filter((r): r is NonNullable<typeof r> => !!r?.tournament)
    .sort((a, b) => +new Date(b.tournament.starts_at) - +new Date(a.tournament.starts_at));

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={p.avatar_url} name={p.display_name} size="xl" rounded />
        <div className="min-w-0 flex-1">
          <PageHeader meta={<span className="inline-flex items-center gap-2">@{p.username} {p.is_demo && <DemoBadge />}</span>} title={p.display_name ?? p.username ?? "Jogador"}
            description={[p.bio, p.preferred_mode && modeLabel[p.preferred_mode], p.region].filter(Boolean).join(" · ") || undefined} />
          {p.status === "suspended" && <p className="mt-2 text-sm text-warning">Conta suspensa.</p>}
        </div>
        {viewer && viewer.id !== p.id && <ReportDialog targetType="user" targetId={p.id} />}
      </div>

      <StatGroup className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Campeonatos" value={s.tournaments ?? 0} icon={Trophy} />
        <StatTile label="Títulos" value={s.titles ?? 0} icon={Crown} />
        <StatTile label="Booyahs" value={s.wins ?? 0} icon={Target} />
        <StatTile label="Abates" value={s.kills ?? 0} icon={Crosshair} />
        <StatTile label="Posição média" value={s.avg_placement ?? "—"} icon={ListOrdered} />
        <StatTile label="Ranking" value={s.ranking_position ? `#${s.ranking_position}` : "—"} icon={Hash} />
      </StatGroup>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-10">
          <Section title="Squads">
            <ul className="grid gap-2">
              {((teams ?? []) as unknown as { role: string; team: { name: string; tag: string; slug: string; logo_url: string | null } }[]).map((t) => (
                <li key={t.team.slug}>
                  <Link href={`/equipes/${t.team.slug}`} className="flex items-center gap-3 rounded-3xl bg-card p-3 hover:border-primary/40">
                    <Avatar src={t.team.logo_url} name={t.team.name} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.team.name} <span className="text-muted-foreground">[{t.team.tag}]</span></span>
                    {t.role === "captain" && <Crown className="size-4 text-primary-text" aria-label="Capitão" />}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Conquistas"><AchievementGrid items={(ach ?? []) as unknown as AchievementRow[]} /></Section>
        </div>
        <Section title="Histórico">
          {hist.length ? (
            <ul className="divide-y rounded-3xl bg-card">
              {hist.map((h) => (
                <li key={h.id}>
                  <Link href={`/campeonatos/${h.tournament.slug}`} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/40">
                    <div className="min-w-0 flex-1"><p className="truncate">{h.tournament.name}</p><p className="text-xs text-muted-foreground">{h.team.name} · {formatDate(h.tournament.starts_at)}</p></div>
                    <span className="font-heading font-bold">{h.final_rank ? `#${h.final_rank}` : "—"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Ainda sem participações.</p>}
        </Section>
      </div>
    </div>
  );
}
