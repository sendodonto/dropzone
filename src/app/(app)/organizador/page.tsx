import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, CircleDollarSign, ClipboardCheck, Flag, Hourglass, ListChecks, MessageSquareWarning, Plus, Trophy, Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Section, StatGroup, StatTile, StatusBadge } from "@/components/shared/ui-bits";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { auditLabel, formatDateTime, formatMoney, formatRelative, plural } from "@/lib/format";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Painel do organizador" };

type Overview = { tournaments: number; active: number; confirmed_teams: number; open_slots: number; pending_results: number; pending_registrations: number; open_disputes: number; open_reports: number; revenue_cents: number };

export default async function OrganizerHome() {
  const { org, viewer } = await requireOrganizer();
  const supabase = await createClient();
  const [{ data: ov }, { data: tournaments }, { data: logs }, { data: payments }] = await Promise.all([
    supabase.rpc("get_organizer_overview", { p_org: org.id }).single(),
    supabase.from("tournaments").select("*").eq("organizer_id", org.id).order("starts_at", { ascending: true }),
    supabase.from("audit_logs").select("id, action, created_at, tournament:tournaments!inner(name, organizer_id)").eq("tournament.organizer_id", org.id)
      .order("created_at", { ascending: false }).limit(8),
    supabase.from("payments").select("id, amount_cents, status, created_at, tournament:tournaments!inner(name, organizer_id)").eq("tournament.organizer_id", org.id)
      .order("created_at", { ascending: false }).limit(5),
  ]);
  const o = (ov ?? {}) as Overview;
  const list = (tournaments ?? []) as Tournament[];
  const ids = list.filter((t) => ["registration_open", "registration_closed", "live"].includes(t.status)).map((t) => t.id);
  const { data: nextMatches } = ids.length
    ? await supabase.from("matches").select("id, number, map, scheduled_at, status, results_status, tournament_id").in("tournament_id", ids)
        .neq("status", "finished").order("scheduled_at").limit(6)
    : { data: [] };
  const byId = new Map(list.map((t) => [t.id, t]));

  return (
    <div className="grid gap-10">
      <PageHeader title={org.name}
        description={org.status === "pending" ? "Seu perfil aguarda aprovação da administração para publicar campeonatos." : org.status === "suspended" ? `Organizador suspenso${org.status_reason ? `: ${org.status_reason}` : ""}.` : undefined}
        actions={viewer.canOrganize && <Link href="/organizador/novo" className={buttonVariants()}><Plus /> Criar campeonato</Link>} />

      {(o.pending_registrations > 0 || o.open_disputes > 0 || o.open_reports > 0 || o.pending_results > 0) && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {o.pending_registrations > 0 && <Alert icon={ClipboardCheck} text={`${plural(o.pending_registrations, "inscrição aguarda", "inscrições aguardam")} aprovação`} />}
          {o.pending_results > 0 && <Alert icon={Hourglass} text={`${plural(o.pending_results, "queda", "quedas")} sem resultado publicado`} />}
          {o.open_disputes > 0 && <Alert icon={MessageSquareWarning} text={plural(o.open_disputes, "contestação aberta", "contestações abertas")} href="/organizador/denuncias" />}
          {o.open_reports > 0 && <Alert icon={AlertTriangle} text={`${plural(o.open_reports, "denúncia", "denúncias")} em aberto`} href="/organizador/denuncias" />}
        </div>
      )}

      <StatGroup className="grid-cols-2 md:grid-cols-4">
        <StatTile label="Campeonatos criados" value={o.tournaments ?? 0} icon={Trophy} />
        <StatTile label="Ativos" value={o.active ?? 0} icon={Flag} />
        <StatTile label="Equipes confirmadas" value={o.confirmed_teams ?? 0} icon={Users} hint="Em campeonatos ativos" />
        <StatTile label="Vagas restantes" value={o.open_slots ?? 0} icon={ListChecks} hint="Inscrições abertas" />
      </StatGroup>

      <div className="grid items-start gap-10 xl:grid-cols-[1.4fr_1fr]">
        <Section title="Próximas partidas">
          {(nextMatches ?? []).length ? (
            <ul className="divide-y rounded-3xl bg-card">
              {(nextMatches ?? []).map((m) => {
                const t = byId.get(m.tournament_id)!;
                return (
                  <li key={m.id}>
                    <Link href={`/organizador/campeonatos/${t.id}?tab=partidas`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                      <span className="grid size-9 place-items-center rounded-lg bg-muted font-heading font-bold">{m.number}</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{m.map} · {formatDateTime(m.scheduled_at)}</p></div>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState icon={Trophy} title="Nenhuma partida agendada" />}
        </Section>
        <Section title="Atividade recente">
          {(logs ?? []).length ? (
            <ul className="divide-y text-sm">
              {(logs as unknown as { id: number; action: string; created_at: string; tournament: { name: string } }[]).map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-2.5">
                  <span className="truncate"><span className="font-medium">{auditLabel(l.action)}</span> <span className="text-muted-foreground">· {l.tournament.name}</span></span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(l.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Sem atividade ainda.</p>}
        </Section>
      </div>

      {/* Payments are disabled platform-wide; the section appears once there is money to show. */}
      {(payments ?? []).length > 0 && (
        <Section title="Financeiro">
          <div className="grid gap-3 sm:grid-cols-[16rem_1fr]">
            <StatGroup><StatTile label="Receita registrada" value={formatMoney(o.revenue_cents)} icon={CircleDollarSign} hint="Pagamentos confirmados, líquidos de taxa" /></StatGroup>
            <ul className="grid gap-2 rounded-3xl bg-card p-4 text-sm">
              {(payments as unknown as { id: string; amount_cents: number; status: string; created_at: string; tournament: { name: string } }[]).map((p) => (
                <li key={p.id} className="flex justify-between"><span>{p.tournament.name} · {p.status}</span><span>{formatMoney(p.amount_cents)}</span></li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
}

function Alert({ icon: Icon, text, href = "/organizador/campeonatos" }: { icon: typeof Flag; text: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm hover:border-warning">
      <Icon className="size-4 shrink-0 text-warning" aria-hidden />{text}
    </Link>
  );
}
