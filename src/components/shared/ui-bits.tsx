import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, statusLabel, registrationLabel } from "@/lib/format";
import type { RegistrationStatus, TournamentStatus } from "@/lib/types";

export function PageHeader({ title, description, actions, meta }: {
  title: string; description?: ReactNode; actions?: ReactNode; meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] text-balance sm:text-4xl">{title}</h1>
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{meta}</div>}
        {description && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl bg-card px-6 py-10 text-center", className)}>
      <div className="mb-3 text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const statusTone: Record<TournamentStatus, string> = {
  draft: "text-muted-foreground",
  registration_open: "text-primary-text",
  registration_closed: "text-warning",
  live: "text-foreground",
  finished: "text-muted-foreground",
  cancelled: "text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: TournamentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", statusTone[status], className)}>
      <span className="relative flex size-1.5" aria-hidden>
        {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-text opacity-75" />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", status === "live" ? "bg-primary-text" : "bg-current")} />
      </span>
      {statusLabel[status]}
    </span>
  );
}

const regTone: Record<RegistrationStatus, string> = {
  pending: "text-warning",
  confirmed: "text-success",
  rejected: "text-destructive",
  withdrawn: "text-muted-foreground",
  removed: "text-destructive",
};

export function RegistrationBadge({ status }: { status: RegistrationStatus }) {
  return <span className={cn("inline-flex text-xs font-semibold", regTone[status])}>{registrationLabel[status]}</span>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex rounded-sm bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground", className)} title="Dados fictícios de demonstração">
      Demo
    </span>
  );
}

/** Square avatar for teams/organizers/players, with initials fallback. */
export function Avatar({ src, name, size = "md", rounded = false, className }: {
  src?: string | null; name?: string | null; size?: "sm" | "md" | "lg" | "xl"; rounded?: boolean; className?: string;
}) {
  const s = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-14 text-base", xl: "size-20 text-xl" }[size];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden bg-muted font-heading text-muted-foreground", "rounded-full", s, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

/** One surface with hairline dividers; avoids a wall of identical floating cards. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-px overflow-hidden rounded-3xl bg-background max-md:[&>*:last-child:nth-child(odd)]:col-span-2", className)}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; icon?: LucideIcon; hint?: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
      </div>
      <div className="mt-2 font-heading text-2xl leading-none tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
      </div>
      {children}
    </section>
  );
}
