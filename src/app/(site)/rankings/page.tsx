import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Trophy } from "lucide-react";
import { Avatar, EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { sinceFor } from "@/lib/queries";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rankings", description: "Ranking de squads, jogadores e organizadores com resultados verificados." };

const TYPES = [
  { id: "squads", label: "Melhores squads" },
  { id: "jogadores", label: "Melhores jogadores" },
  { id: "abates", label: "Mais abates" },
  { id: "vitorias", label: "Mais vitórias" },
  { id: "desempenho", label: "Melhor desempenho" },
  { id: "organizadores", label: "Organizadores" },
] as const;
const PERIODS = [
  { id: "geral", label: "Histórico" },
  { id: "semana", label: "Semanal" },
  { id: "mes", label: "Mensal" },
  { id: "temporada", label: "Temporada" },
] as const;

type TeamRow = { rank: number; team_id: string; name: string; tag: string; slug: string; logo_url: string | null; tournaments: number; titles: number; matches: number; wins: number; kills: number; points: number; avg_placement: number };
type PlayerRow = { rank: number; user_id: string; username: string; display_name: string; avatar_url: string | null; tournaments: number; matches: number; wins: number; kills: number; team_points: number; avg_placement: number };
type OrgRow = { rank: number; organizer_id: string; name: string; slug: string; logo_url: string | null; is_official: boolean; tournaments: number; teams_hosted: number };

export default async function RankingsPage({ searchParams }: PageProps<"/rankings">) {
  const sp = (await searchParams) as { tipo?: string; periodo?: string; temporada?: string };
  const tipo = TYPES.find((t) => t.id === sp.tipo)?.id ?? "squads";
  const periodo = PERIODS.find((p) => p.id === sp.periodo)?.id ?? "geral";
  const supabase = await createClient();
  const { data: seasons } = await supabase.from("seasons").select("id, name, starts_at, ends_at").order("starts_at", { ascending: false });
  const today = new Date().toISOString().slice(0, 10);
  const season = periodo === "temporada"
    ? (seasons ?? []).find((s) => s.id === sp.temporada) ?? (seasons ?? []).find((s) => s.starts_at <= today && s.ends_at >= today) ?? seasons?.[0]
    : undefined;
  const args = { p_since: sinceFor(periodo), p_season: season?.id ?? null, p_limit: 100 };

  let rows: (TeamRow | PlayerRow | OrgRow)[] = [];
  if (tipo === "organizadores") rows = ((await supabase.rpc("get_organizer_rankings", { p_since: args.p_since, p_limit: 50 })).data ?? []) as OrgRow[];
  else if (["squads", "vitorias", "desempenho"].includes(tipo)) {
    const data = ((await supabase.rpc("get_team_rankings", args)).data ?? []) as TeamRow[];
    rows = tipo === "vitorias" ? reRank([...data].sort((a, b) => b.wins - a.wins || b.titles - a.titles))
      : tipo === "desempenho" ? reRank([...data].filter((d) => d.matches >= 3).sort((a, b) => a.avg_placement - b.avg_placement))
      : data;
  } else {
    const data = ((await supabase.rpc("get_player_rankings", args)).data ?? []) as PlayerRow[];
    rows = tipo === "jogadores" ? reRank([...data].sort((a, b) => b.team_points - a.team_points || b.kills - a.kills)) : data;
  }

  const link = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ tipo, periodo, ...(season ? { temporada: season.id } : {}), ...patch });
    return `/rankings?${q}`;
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title="Rankings" description="Somente resultados verificados de campeonatos finalizados contam para o ranking oficial." />
      <nav className="scrollbar-none scroll-fade -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Tipo de ranking">
        {TYPES.map((t) => (
          <Link key={t.id} href={link({ tipo: t.id })} aria-current={tipo === t.id ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", tipo === t.id ? "bg-primary font-medium text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Link key={p.id} href={link({ periodo: p.id })} aria-current={periodo === p.id ? "page" : undefined}
            className={cn("rounded-md border px-3 py-1 text-sm", periodo === p.id ? "border-primary text-primary-text" : "text-muted-foreground hover:text-foreground")}>
            {p.label}
          </Link>
        ))}
        {periodo === "temporada" && (seasons ?? []).length > 1 && (
          <div className="flex gap-1">
            {(seasons ?? []).map((s) => (
              <Link key={s.id} href={link({ temporada: s.id })} className={cn("rounded-md px-2 py-1 text-xs", season?.id === s.id ? "bg-muted text-foreground" : "text-muted-foreground")}>{s.name}</Link>
            ))}
          </div>
        )}
      </div>
      {periodo === "temporada" && !season && <p className="text-sm text-muted-foreground">Nenhuma temporada cadastrada.</p>}

      {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-12 px-3 py-2.5 text-center">#</th>
                <th scope="col" className="px-3 py-2.5">{tipo === "organizadores" ? "Organizador" : ["jogadores", "abates"].includes(tipo) ? "Jogador" : "Squad"}</th>
                {tipo === "organizadores" ? (<><Th>Campeonatos</Th><Th>Squads</Th></>)
                  : ["jogadores", "abates"].includes(tipo) ? (<><Th>Camp.</Th><Th>Booyah</Th><Th>Abates</Th><Th>Pontos</Th></>)
                  : (<><Th>Camp.</Th><Th>Títulos</Th><Th>Booyah</Th><Th>Abates</Th><Th>{tipo === "desempenho" ? "Pos. média" : "Pontos"}</Th></>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                if ("organizer_id" in r) return (
                  <tr key={r.organizer_id} className="border-b last:border-0">
                    <RankCell rank={r.rank} />
                    <td className="px-3 py-2.5"><Link href={`/organizadores/${r.slug}`} className="flex items-center gap-2 font-medium hover:text-primary-text"><Avatar src={r.logo_url} name={r.name} size="sm" />{r.name}{r.is_official && <ShieldCheck className="size-4 text-primary-text" aria-label="Oficial" />}</Link></td>
                    <Td>{r.tournaments}</Td><Td strong>{r.teams_hosted}</Td>
                  </tr>
                );
                if ("user_id" in r) return (
                  <tr key={r.user_id} className="border-b last:border-0">
                    <RankCell rank={r.rank} />
                    <td className="px-3 py-2.5"><Link href={`/jogadores/${r.username}`} className="flex items-center gap-2 hover:text-primary-text"><Avatar src={r.avatar_url} name={r.display_name} size="sm" rounded /><span className="font-medium">{r.display_name}</span><span className="hidden text-xs text-muted-foreground sm:inline">@{r.username}</span></Link></td>
                    <Td>{r.tournaments}</Td><Td>{r.wins}</Td><Td strong={tipo === "abates"}>{r.kills}</Td><Td strong={tipo === "jogadores"}>{formatPoints(r.team_points)}</Td>
                  </tr>
                );
                return (
                  <tr key={r.team_id} className="border-b last:border-0">
                    <RankCell rank={r.rank} />
                    <td className="px-3 py-2.5"><Link href={`/equipes/${r.slug}`} className="flex items-center gap-2 hover:text-primary-text"><Avatar src={r.logo_url} name={r.name} size="sm" /><span className="font-medium">{r.name}</span><span className="hidden text-xs text-muted-foreground sm:inline">[{r.tag}]</span></Link></td>
                    <Td>{r.tournaments}</Td><Td>{r.titles}</Td><Td strong={tipo === "vitorias"}>{r.wins}</Td><Td>{r.kills}</Td>
                    <Td strong={tipo !== "vitorias"}>{tipo === "desempenho" ? `${r.avg_placement}º` : formatPoints(r.points)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Trophy} title="Sem dados neste período" description="O ranking é formado por campeonatos finalizados com resultados publicados." />
      )}
    </div>
  );
}

function reRank<T extends { rank: number }>(rows: T[]) {
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="px-3 py-2.5 text-right">{children}</th>;
}
function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={cn("px-3 py-2.5 text-right tabular-nums", strong ? "font-heading text-base font-bold" : "text-muted-foreground")}>{children}</td>;
}
function RankCell({ rank }: { rank: number }) {
  return (
    <td className="px-3 py-2.5 text-center">
      <span className={cn("inline-grid size-7 place-items-center rounded-md font-heading font-bold", rank === 1 ? "bg-primary text-primary-foreground" : rank <= 3 ? "bg-muted" : "text-muted-foreground")}>{rank}</span>
    </td>
  );
}
