// Pure scoring rules, mirrored from the SQL trigger `match_results_compute`
// and function `get_tournament_standings` (the database is authoritative;
// this module powers live previews in the organizer UI and the unit tests).
import type { Tiebreaker } from "@/lib/types";

export interface ScoringConfig {
  placementPoints: number[]; // index 0 = 1st place
  killPoints: number;
  maxBonus: number;
  tiebreakers: Tiebreaker[];
}

export const DEFAULT_SCORING: ScoringConfig = {
  placementPoints: [12, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  killPoints: 1,
  maxBonus: 0,
  tiebreakers: ["wins", "kills", "best_placement", "last_match"],
};

export const TIEBREAKER_LABEL: Record<Tiebreaker, string> = {
  wins: "Mais Booyahs (1º lugar)",
  kills: "Mais eliminações",
  best_placement: "Melhor colocação",
  placement_points: "Mais pontos de colocação",
  last_match: "Melhor colocação na última queda",
};

export function matchPoints(cfg: ScoringConfig, placement: number, kills: number, bonus = 0) {
  if (!Number.isInteger(placement) || placement < 1) throw new Error("Colocação inválida");
  if (kills < 0) throw new Error("Eliminações inválidas");
  if (Math.abs(bonus) > cfg.maxBonus) throw new Error(`Bônus acima do permitido (máx. ${cfg.maxBonus})`);
  const placementPts = cfg.placementPoints[placement - 1] ?? 0;
  const killPts = kills * cfg.killPoints;
  return { placementPts, killPts, total: placementPts + killPts + bonus };
}

export interface ResultInput {
  teamId: string;
  match: number;
  placement: number;
  kills: number;
  bonus?: number;
}

export interface Standing {
  teamId: string;
  rank: number;
  total: number;
  placementPts: number;
  kills: number;
  wins: number;
  bestPlacement: number | null;
  lastPlacement: number | null;
  matches: number;
}

export function computeStandings(cfg: ScoringConfig, teamIds: string[], results: ResultInput[]): Standing[] {
  const rows = new Map<string, Standing & { lastMatch: number }>();
  for (const id of teamIds) {
    rows.set(id, { teamId: id, rank: 0, total: 0, placementPts: 0, kills: 0, wins: 0, bestPlacement: null, lastPlacement: null, matches: 0, lastMatch: -1 });
  }
  for (const r of results) {
    const row = rows.get(r.teamId);
    if (!row) continue;
    const p = matchPoints(cfg, r.placement, r.kills, r.bonus ?? 0);
    row.total += p.total;
    row.placementPts += p.placementPts;
    row.kills += r.kills;
    row.matches += 1;
    if (r.placement === 1) row.wins += 1;
    row.bestPlacement = row.bestPlacement === null ? r.placement : Math.min(row.bestPlacement, r.placement);
    if (r.match > row.lastMatch) {
      row.lastMatch = r.match;
      row.lastPlacement = r.placement;
    }
  }
  const key = (s: Standing) =>
    cfg.tiebreakers.map((tb) => {
      switch (tb) {
        case "wins": return s.wins;
        case "kills": return s.kills;
        case "placement_points": return s.placementPts;
        case "best_placement": return -(s.bestPlacement ?? 999);
        case "last_match": return -(s.lastPlacement ?? 999);
      }
    });
  const cmp = (a: Standing, b: Standing) => {
    if (b.total !== a.total) return b.total - a.total;
    const ka = key(a), kb = key(b);
    for (let i = 0; i < ka.length; i++) if (kb[i] !== ka[i]) return kb[i] - ka[i];
    return 0;
  };
  const sorted = [...rows.values()].sort(cmp);
  // Same as SQL rank(): ties that survive every tiebreaker share a position.
  sorted.forEach((s, i) => {
    s.rank = i > 0 && cmp(sorted[i - 1], s) === 0 ? sorted[i - 1].rank : i + 1;
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return sorted.map(({ lastMatch, ...s }) => s);
}

/** Validates one match's result sheet before it is saved. */
export function validateResultSheet(rows: { placement: number; kills: number }[], maxPlacement: number) {
  const errors: string[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    if (!Number.isInteger(r.placement) || r.placement < 1 || r.placement > maxPlacement)
      errors.push(`Colocação ${r.placement} fora do intervalo 1–${maxPlacement}.`);
    else if (seen.has(r.placement)) errors.push(`Colocação ${r.placement} repetida.`);
    seen.add(r.placement);
    if (!Number.isInteger(r.kills) || r.kills < 0 || r.kills > 200) errors.push(`Eliminações inválidas (${r.kills}).`);
  }
  return errors;
}
