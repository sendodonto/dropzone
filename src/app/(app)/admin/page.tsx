import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CircleDollarSign, ClipboardList, Flag, Radio, ShieldAlert, Trophy, UserCheck, Users } from "lucide-react";
import { PageHeader, Section, StatGroup, StatTile } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Administração" };

type Stats = { users: number; active_players: number; organizers: number; published: number; live: number; teams: number; registrations: number; payments_confirmed_cents: number; open_reports: number; pending_organizers: number; paid_requests: number };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: s }, { data: logs }] = await Promise.all([
    supabase.rpc("get_platform_stats").single(),
    supabase.from("audit_logs").select("id, action, entity_type, created_at, actor:profiles(username)").order("created_at", { ascending: false }).limit(12),
  ]);
  const st = (s ?? {}) as Stats;
  return (
    <div className="grid gap-10">
      <PageHeader title="Painel administrativo" description="Visão geral da plataforma." />
      {(st.pending_organizers > 0 || st.open_reports > 0 || st.paid_requests > 0) && (
        <div className="grid gap-2 sm:grid-cols-3">
          {st.pending_organizers > 0 && <Todo href="/admin/organizadores?status=pending" text={`${st.pending_organizers} organizador(es) aguardando aprovação`} />}
          {st.open_reports > 0 && <Todo href="/admin/denuncias" text={`${st.open_reports} denúncia(s) em aberto`} />}
          {st.paid_requests > 0 && <Todo href="/admin/campeonatos?pagos=1" text={`${st.paid_requests} pedido(s) de inscrição paga`} />}
        </div>
      )}
      <StatGroup className="grid-cols-2 md:grid-cols-3">
        <StatTile label="Usuários" value={st.users ?? 0} icon={Users} />
        <StatTile label="Jogadores ativos" value={st.active_players ?? 0} icon={UserCheck} hint="Últimos 30 dias" />
        <StatTile label="Organizadores" value={st.organizers ?? 0} icon={Building2} />
        <StatTile label="Campeonatos publicados" value={st.published ?? 0} icon={Trophy} />
        <StatTile label="Em andamento" value={st.live ?? 0} icon={Radio} />
        <StatTile label="Equipes" value={st.teams ?? 0} icon={Flag} />
        <StatTile label="Participações" value={st.registrations ?? 0} icon={ClipboardList} />
        <StatTile label="Volume registrado" value={formatMoney(st.payments_confirmed_cents)} icon={CircleDollarSign} hint="Pagamentos confirmados" />
        <StatTile label="Denúncias abertas" value={st.open_reports ?? 0} icon={ShieldAlert} />
      </StatGroup>
      <Section title="Atividade recente" action={<Link href="/admin/logs" className="text-sm text-primary-text hover:underline">Todos os logs</Link>}>
        <ul className="divide-y rounded-3xl bg-card text-sm">
          {((logs ?? []) as unknown as { id: number; action: string; entity_type: string; created_at: string; actor: { username: string } | null }[]).map((l) => (
            <li key={l.id} className="flex justify-between gap-3 p-3">
              <span className="truncate"><span className="font-mono text-xs text-primary-text">{l.action}</span> <span className="text-muted-foreground">por @{l.actor?.username ?? "sistema"}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(l.created_at)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Todo({ href, text }: { href: string; text: string }) {
  return <Link href={href} className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm hover:border-warning">{text}</Link>;
}
