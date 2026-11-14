import { Crosshair, Crown, Flag, Medal, Trophy, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/ui-bits";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = { Flag, Trophy, Crosshair, Medal, Crown };
const tierStyle: Record<string, string> = {
  bronze: "text-[oklch(0.72_0.1_55)] bg-[oklch(0.72_0.1_55/12%)]",
  silver: "text-[oklch(0.86_0_0)] bg-white/8",
  gold: "text-warning bg-warning/12",
  legend: "text-primary-text bg-primary/12",
};

export type AchievementRow = { awarded_at: string; achievement: { code: string; name: string; description: string; icon: string; tier: string } };

export function AchievementGrid({ items }: { items: AchievementRow[] }) {
  if (!items.length)
    return <EmptyState icon={Medal} title="Nenhuma conquista ainda" description="Termine o primeiro campeonato para desbloquear a primeira." />;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(({ achievement: a, awarded_at }) => {
        const Icon = icons[a.icon] ?? Medal;
        return (
          <li key={a.code} className="rounded-3xl bg-card p-3" title={a.description}>
            <span className={cn("grid size-9 place-items-center rounded-lg", tierStyle[a.tier])}><Icon className="size-5" aria-hidden /></span>
            <p className="mt-2 text-sm font-medium">{a.name}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(awarded_at)}</p>
          </li>
        );
      })}
    </ul>
  );
}
