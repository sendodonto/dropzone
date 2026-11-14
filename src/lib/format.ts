import { site } from "@/config/site";
import type { EntryType, GameMode, RegistrationStatus, TournamentStatus } from "@/lib/types";

const tz = site.timezone;

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(".", "");
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(iso))
    .replace(".", "");
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatRelative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function formatMoney(cents: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents ?? 0) / 100);
}

export function formatPoints(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Datetime-local input value (in the platform timezone) → ISO string. */
export function localInputToIso(value: string) {
  if (!value) return null;
  // Interpret the value as São Paulo time (UTC-3, no DST since 2019).
  return new Date(`${value}:00-03:00`).toISOString();
}

export function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export const statusLabel: Record<TournamentStatus, string> = {
  draft: "Rascunho",
  registration_open: "Inscrições abertas",
  registration_closed: "Inscrições encerradas",
  live: "Em andamento",
  finished: "Encerrado",
  cancelled: "Cancelado",
};

export const registrationLabel: Record<RegistrationStatus, string> = {
  pending: "Aguardando aprovação",
  confirmed: "Confirmada",
  rejected: "Recusada",
  withdrawn: "Cancelada pelo squad",
  removed: "Removida",
};

export const modeLabel: Record<GameMode, string> = { squad: "Squad (4v4)", duo: "Duo", solo: "Solo" };
export const entryLabel: Record<EntryType, string> = { free: "Gratuito", paid: "Pago", sponsored: "Patrocinado" };
export const platformLabel = { mobile: "Mobile", emulator: "Emulador", mixed: "Misto" } as const;

export const reportReasonLabel = {
  fraud: "Fraude",
  suspicious_result: "Resultado suspeito",
  misconduct: "Comportamento inadequado",
  false_information: "Informações falsas",
  rules_violation: "Descumprimento de regulamento",
} as const;

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

/** "1 campeonato", "3 campeonatos". */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Plain-language names for audit_logs.action codes shown to organizers. Unknown codes fall back to the raw code. */
const auditLabels: Record<string, string> = {
  "tournament.created": "Campeonato criado", "tournament.published": "Campeonato publicado", "tournament.status": "Status alterado",
  "tournament.rescheduled": "Data alterada", "tournament.finalized": "Campeonato finalizado", "tournament.moderated": "Moderação aplicada",
  "tournament.paid_requested": "Inscrição paga solicitada", "tournament.paid_review": "Inscrição paga revisada",
  "registration.created": "Nova inscrição", "registration.withdrawn": "Inscrição retirada", "registration.confirmed": "Inscrição aprovada",
  "registration.rejected": "Inscrição recusada", "registration.removed": "Equipe removida", "registration.pending": "Inscrição em análise",
  "match.rescheduled": "Queda remarcada", "room.published": "Sala liberada", "room.unpublished": "Sala ocultada",
  "results.published": "Resultado publicado", "dispute.opened": "Contestação aberta", "dispute.resolved": "Contestação resolvida",
  "announcement.posted": "Aviso publicado", "organizer.created": "Organizador criado", "organizer.plan": "Plano alterado",
  "season.champions": "Campeões da temporada", "plan.updated": "Plano atualizado", "setting.updated": "Configuração alterada",
  "role.granted": "Permissão concedida", "role.revoked": "Permissão removida", "role.bootstrap_admin": "Primeiro admin definido",
};
export const auditLabel = (action: string) => auditLabels[action] ?? action;
