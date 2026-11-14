"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Building2, CalendarRange, ClipboardList, Flag, Gauge, LayoutDashboard, ListChecks, Medal, Plus, ScrollText,
  Settings, Shield, ShieldAlert, Trophy, User, Users, Wallet, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollStrip } from "@/components/shared/scroll-strip";

const icons = {
  dashboard: LayoutDashboard, squads: Users, trophy: Trophy, bell: Bell, user: User, org: Building2, plus: Plus,
  list: ListChecks, alert: ShieldAlert, gauge: Gauge, shield: Shield, flag: Flag, settings: Settings, log: ScrollText,
  season: CalendarRange, medal: Medal, wallet: Wallet, plans: CreditCard, clipboard: ClipboardList,
} as const;
export type IconName = keyof typeof icons;
export type NavGroup = { title: string; items: { href: string; label: string; icon: IconName; badge?: number; exact?: boolean }[] };

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r bg-sidebar px-3 py-5 lg:block" aria-label="Navegação da área">
      {groups.map((g) => (
        <div key={g.title} className="mb-6">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
          <ul className="grid gap-0.5">
            {g.items.map((i) => {
              const Icon = icons[i.icon];
              const on = active(pathname, i.href, i.exact);
              return (
                <li key={i.href}>
                  <Link href={i.href} aria-current={on ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      on ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
                    <Icon className={cn("size-4", on && "text-primary-text")} aria-hidden />
                    {i.label}
                    {!!i.badge && <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{i.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

/** Mobile bottom navigation (thumb-friendly, safe-area aware). */
export function BottomNav({ items }: { items: NavGroup["items"] }) {
  const pathname = usePathname();
  return (
    <nav className="material-bar pb-safe fixed inset-x-0 bottom-0 z-40 border-t lg:hidden" aria-label="Navegação inferior">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.slice(0, 5).map((i) => {
          const Icon = icons[i.icon];
          const on = active(pathname, i.href, i.exact);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined}
                className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors active:opacity-60", on ? "font-medium text-primary-text" : "text-muted-foreground")}>
                <Icon className="size-5" aria-hidden />
                {i.label}
                {!!i.badge && <span className="absolute top-1.5 left-1/2 ml-2 rounded-full bg-primary px-1 text-[9px] font-bold leading-3.5 text-primary-foreground">{i.badge > 9 ? "9+" : i.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Horizontal scrollable sub-navigation for mobile inside organizer/admin areas. */
export function MobileSubNav({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  return (
    <ScrollStrip label={group.title} className="scrollbar-none scroll-fade -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b px-4 pb-3 lg:hidden">
      {group.items.map((i) => {
        const on = active(pathname, i.href, i.exact);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}
            className={cn("inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {i.label}
          </Link>
        );
      })}
    </ScrollStrip>
  );
}
