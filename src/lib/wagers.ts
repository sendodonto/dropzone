// Apostados (X1–X4 with a stake). Pure helpers shared by server pages and client components.
export type WagerStatus = "open" | "accepted" | "paid" | "live" | "disputed" | "finished" | "cancelled";

export interface Wager {
  id: string;
  code: number;
  team_size: number;
  stake_cents: number;
  fee_percent: number;
  rounds: number;
  map: string;
  rules: string | null;
  status: WagerStatus;
  creator_id: string;
  a_team_id: string | null;
  a_players: string[];
  b_captain_id: string | null;
  b_team_id: string | null;
  b_players: string[] | null;
  a_paid_at: string | null;
  b_paid_at: string | null;
  a_report: "a" | "b" | null;
  b_report: "a" | "b" | null;
  winner: "a" | "b" | null;
  paid_out_at: string | null;
  resolution: string | null;
  created_at: string;
  accepted_at: string | null;
  finished_at: string | null;
  a_team?: { name: string; slug: string } | null;
  b_team?: { name: string; slug: string } | null;
}

export const WAGER_SELECT = "*, a_team:teams!wagers_a_team_id_fkey(name, slug), b_team:teams!wagers_b_team_id_fkey(name, slug)";

export const wagerStatusLabel: Record<WagerStatus, string> = {
  open: "Aberto", accepted: "Aguardando Pix", paid: "Pix confirmado", live: "Em jogo",
  disputed: "Em disputa", finished: "Encerrado", cancelled: "Cancelado",
};

export const roundsLabel = (n: number) => (n === 1 ? "1 partida" : `Melhor de ${n}`);
/** What one side pays: stake per player × players. */
export const sideCost = (w: Pick<Wager, "stake_cents" | "team_size">) => w.stake_cents * w.team_size;
/** What the winning side receives after the mediator's fee. */
export const wagerPrize = (w: Pick<Wager, "stake_cents" | "team_size" | "fee_percent">) =>
  Math.round(sideCost(w) * 2 * (1 - Number(w.fee_percent) / 100));
