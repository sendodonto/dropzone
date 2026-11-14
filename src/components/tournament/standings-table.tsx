import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { Avatar, EmptyState } from "@/components/shared/ui-bits";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/types";

export function StandingsTable({ rows, highlight, totalMatches }: { rows: StandingRow[]; highlight?: Set<string>; totalMatches?: number }) {
  if (!rows.length || rows.every((r) => Number(r.matches_played) === 0))
    return <EmptyState icon={ListOrdered} title="Classificação ainda vazia" description="Aparece assim que o organizador publicar o resultado da primeira queda." />;
  return (
    <div className="overflow-x-auto rounded-3xl bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Classificação geral</caption>
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="w-10 px-2 py-2.5 text-center sm:w-12 sm:px-3">#</th>
            <th scope="col" className="px-3 py-2.5">Equipe</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Quedas</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell" title="Booyahs (1º lugar)">Booyah</th>
            <th scope="col" className="w-px px-2 py-2.5 text-right whitespace-nowrap sm:px-3">Abates</th>
            <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Pos.</th>
            <th scope="col" className="w-px px-2 py-2.5 text-right whitespace-nowrap sm:px-3">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rank = Number(r.rank);
            return (
              <tr key={r.registration_id} className={cn("border-b last:border-0", highlight?.has(r.registration_id) && "bg-primary/[0.07]")}>
                <td className="px-2 py-2.5 text-center sm:px-3">
                  <span className={cn("inline-grid size-7 place-items-center rounded-md font-heading font-bold",
                    rank === 1 ? "bg-primary text-primary-foreground" : rank <= 3 ? "bg-muted text-foreground" : "text-muted-foreground")}>{rank}</span>
                </td>
                <td className="w-full max-w-0 px-2 py-2.5 sm:px-3">
                  <Link href={`/equipes/${r.team_slug}`} className="flex min-w-0 items-center gap-2.5 hover:text-primary-text">
                    <Avatar src={r.team_logo} name={r.team_name} size="sm" />
                    <span className="truncate font-medium">{r.team_name}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">[{r.team_tag}]</span>
                  </Link>
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">{r.matches_played}{totalMatches ? `/${totalMatches}` : ""}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.wins}</td>
                <td className="px-2 py-2.5 text-right tabular-nums sm:px-3">{r.kills}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">{formatPoints(r.placement_points)}</td>
                <td className="px-2 py-2.5 text-right font-heading text-base font-bold tabular-nums sm:px-3">{formatPoints(r.total_points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
