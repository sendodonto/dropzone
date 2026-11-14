import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Crosshair, Hash, ListOrdered, Medal, Swords, Target, Trophy, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, DemoBadge, EmptyState, PageHeader, RegistrationBadge, Section, StatGroup, StatTile, StatusBadge } from "@/components/shared/ui-bits";
import { InviteList } from "@/components/app/invite-card";
import { AchievementGrid, type AchievementRow } from "@/components/shared/achievements";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyInvites, getMyRegistrations, getMyTeams } from "@/lib/player";
import { formatDateTime, formatPoints, formatRelative } from "@/lib/format";
import type { Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Meu painel" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [summary, regs, teams, invites, notifs, achievements] = await Promise.all([
    supabase.rpc("get_player_summary", { p_user: viewer.id }).single(),
    getMyRegistrations(viewer.id),
    getMyTeams(viewer.id),
    getMyInvites(viewer.id),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("user_achievements").select("awarded_at, achievement:achievements(*)").eq("user_id", viewer.id).order("awarded_at", { ascending: false }),
  ]);
  const s = (summary.data ?? {}) as { tournaments?: number; titles?: number; wins?: number; kills?: number; points?: number; avg_placement?: number; ranking_position?: number };
  const active = regs.filter((r) => ["registration_open", "registration_closed", "live"].includes(r.tournament.status) && ["pending", "confirmed"].includes(r.status));
  const name = viewer.profile.display_name ?? viewer.profile.username;

  return (
    <div className="grid gap-10">
      <PageHeader title={`E aí, ${name}!`} description="Seus campeonatos, squads e resultados em um só lugar."
        actions={<Link href="/campeonatos?status=open" className={buttonVariants()}><Swords /> Encontrar campeonato</Link>} />

      {invites.length > 0 && <Section title="Convites pendentes"><InviteList invites={invites} /></Section>}

      <StatGroup className="grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Campeonatos" value={s.tournaments ?? 0} icon={Trophy} />
        <StatTile label="Títulos" value={s.titles ?? 0} icon={Medal} />
        <StatTile label="Booyahs" value={s.wins ?? 0} icon={Target} hint="1º lugar em quedas" />
        <StatTile label="Abates" value={s.kills ?? 0} icon={Crosshair} />
        <StatTile label="Posição média" value={s.avg_placement ?? "—"} icon={ListOrdered} />
        <StatTile label="Ranking" value={s.ranking_position ? `#${s.ranking_position}` : "—"} icon={Hash} hint={`${formatPoints(s.points)} pts de equipe`} />
      </StatGroup>

      <div className="grid gap-10 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Próximos campeonatos" action={<Link href="/painel/campeonatos" className="text-sm text-primary-text hover:underline">Ver todos</Link>}>
          {active.length ? (
            <ul className="divide-y rounded-3xl bg-card">
              {active.map((r) => (
                <li key={r.id}>
                  <Link href={`/campeonatos/${r.tournament.slug}`} className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/40">
                    <Avatar src={r.team.logo_url} name={r.team.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.tournament.name} {r.tournament.is_demo && <DemoBadge />}</p>
                      <p className="text-xs text-muted-foreground">{r.team.name} · {formatDateTime(r.tournament.starts_at)}</p>
                    </div>
                    <div className="flex basis-full gap-3 pl-12 sm:basis-auto sm:pl-0"><RegistrationBadge status={r.status} /><StatusBadge status={r.tournament.status} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Trophy} title="Nenhuma inscrição ativa" description="Inscreva seu squad em um campeonato com vagas abertas."
              action={<Link href="/campeonatos?status=open" className={buttonVariants({ variant: "outline" })}>Ver campeonatos abertos</Link>} />
          )}
        </Section>

        <Section title="Meus squads" action={<Link href="/painel/squads" className="text-sm text-primary-text hover:underline">Gerenciar</Link>}>
          {teams.length ? (
            <ul className="grid gap-2">
              {teams.map(({ team, role }) => (
                <li key={team.id}>
                  <Link href={`/painel/squads/${team.id}`} className="flex items-center gap-3 rounded-3xl bg-card p-3 hover:border-primary/40">
                    <Avatar src={team.logo_url} name={team.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{team.name} <span className="text-muted-foreground">[{team.tag}]</span></p>
                      <p className="text-xs text-muted-foreground">{team.members?.[0]?.count ?? 0} integrantes · {role === "captain" ? "Capitão" : "Jogador"}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Você ainda não tem squad" action={<Link href="/painel/squads" className={buttonVariants()}>Criar squad</Link>} />
          )}
        </Section>
      </div>

      <div className="grid gap-10 xl:grid-cols-2">
        <Section title="Atividade recente" action={<Link href="/painel/notificacoes" className="text-sm text-primary-text hover:underline">Ver tudo</Link>}>
          {(notifs.data ?? []).length ? (
            <ul className="divide-y rounded-3xl bg-card">
              {(notifs.data as Notification[]).map((n) => (
                <li key={n.id} className="flex gap-3 p-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-muted" : "bg-primary"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.link ? <Link href={n.link} className="hover:text-primary-text">{n.title}</Link> : n.title}</p>
                    {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={Bell} title="Sem atividades por enquanto" />}
        </Section>

        <Section title="Conquistas">
          <AchievementGrid items={(achievements.data ?? []) as unknown as AchievementRow[]} />
        </Section>
      </div>
    </div>
  );
}
