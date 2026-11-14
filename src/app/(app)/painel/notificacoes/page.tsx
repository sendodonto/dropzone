import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck, ClipboardCheck, Clock, KeyRound, Megaphone, ShieldAlert, Trophy, Users, type LucideIcon } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsRead } from "@/lib/actions/community";
import { formatRelative, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Notificações" };

const typeIcon: Record<string, LucideIcon> = {
  invite: Users, registration: ClipboardCheck, schedule: Clock, room: KeyRound, results: Trophy,
  announcement: Megaphone, report: ShieldAlert, system: Bell,
};

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as Notification[];
  const unread = list.filter((n) => !n.read_at).length;
  return (
    <div className="grid gap-6">
      <RealtimeRefresh table="notifications" filter={`user_id=eq.${viewer.id}`} />
      <PageHeader title="Notificações" description={unread ? plural(unread, "não lida", "não lidas") : "Tudo em dia."}
        actions={unread > 0 && <ActionButton action={markNotificationsRead.bind(null, undefined)} variant="outline"><CheckCheck /> Marcar todas como lidas</ActionButton>} />
      {list.length ? (
        <ul className="divide-y rounded-3xl bg-card">
          {list.map((n) => {
            const Icon = typeIcon[n.type] ?? Bell;
            return (
              <li key={n.id} className={cn("flex gap-3 p-4", !n.read_at && "bg-primary/[0.04]")}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", n.read_at ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary-text")}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatRelative(n.created_at)}</span>
                    {n.link && <Link href={n.link} className="text-primary-text hover:underline">Abrir</Link>}
                    {!n.read_at && <ActionButton action={markNotificationsRead.bind(null, [n.id])} variant="link" size="xs" className="h-auto p-0 text-xs">Marcar como lida</ActionButton>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={Bell} title="Nenhuma notificação" description="Convites, salas e resultados aparecerão aqui." />}
    </div>
  );
}
