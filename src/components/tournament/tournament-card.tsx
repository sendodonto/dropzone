import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/ui-bits";
import { entryText, formatDateTime, formatMoney, modeLabel } from "@/lib/format";
import { regCount } from "@/lib/queries";
import type { TournamentCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Slots filled vs. total, with the count printed beside the bar it describes. */
export function SlotBar({ taken, max, solo, className }: { taken: number; max: number; solo?: boolean; className?: string }) {
  const pct = Math.min(100, Math.round((taken / max) * 100));
  const full = taken >= max;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Vagas preenchidas">
        <div className={cn("h-full rounded-full", full ? "bg-foreground" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{taken}</span>/{max} {solo ? "jogadores" : "squads"}
      </span>
    </div>
  );
}

export function prizeText(t: Pick<TournamentCardData, "prize_pool_cents" | "prize_description">) {
  return t.prize_pool_cents > 0 ? formatMoney(t.prize_pool_cents) : t.prize_description ? "Com premiação" : null;
}

/** A tournament listing: what, who, when and how full. Type carries the hierarchy, not boxes or icons. */
export function TournamentCard({ t, className }: { t: TournamentCardData; className?: string }) {
  const taken = regCount(t);
  const prize = prizeText(t);
  const facts = [modeLabel[t.mode], entryText(t), prize].filter(Boolean);
  return (
    <Link
      href={`/campeonatos/${t.slug}`}
      className={cn(
        "press group flex flex-col rounded-3xl bg-card p-5 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      {t.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.cover_url} alt="" className="-mx-5 -mt-5 mb-5 aspect-[16/8] w-[calc(100%+2.5rem)] max-w-none rounded-t-3xl object-cover" loading="lazy" />
      )}
      <div className="flex items-center gap-2 text-xs">
        <StatusBadge status={t.status} />
        <span className="text-muted-foreground">· {formatDateTime(t.starts_at)}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-[1.2rem] group-hover:text-primary-text">{t.name}</h3>
      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        {t.organizer?.name}
        {t.organizer?.is_official && <ShieldCheck className="size-3.5 text-primary-text" aria-label="Organizador oficial" />}
      </p>
      <p className="mt-3 text-sm">{facts.join(" · ")}</p>
      <SlotBar className="mt-auto pt-5" taken={taken} max={t.max_teams} solo={t.mode === "solo"} />
    </Link>
  );
}

export function TournamentCardSkeleton() {
  return (
    <div className="grid gap-3 rounded-3xl bg-card p-5">
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-1.5 animate-pulse rounded bg-muted" />
    </div>
  );
}
