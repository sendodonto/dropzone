import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/shared/ui-bits";
import { DisputeDecision, ReportDecision } from "@/components/organizer/decision-buttons";
import { requireOrganizer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, reportReasonLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Ocorrências" };

export default async function OrganizerReportsPage() {
  const { org } = await requireOrganizer();
  const supabase = await createClient();
  const [{ data: disputes }, { data: reports }] = await Promise.all([
    supabase.from("disputes").select("id, reason, evidence_urls, status, resolution, created_at, match:matches(number), registration:tournament_registrations(team:teams(name)), tournament:tournaments!inner(id, name, organizer_id)")
      .eq("tournament.organizer_id", org.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("reports").select("id, reason, description, evidence_urls, status, decision, target_type, created_at, tournament:tournaments!inner(id, name, organizer_id)")
      .eq("tournament.organizer_id", org.id).order("created_at", { ascending: false }).limit(50),
  ]);
  type D = { id: string; reason: string; evidence_urls: string[]; status: string; resolution: string | null; created_at: string; match: { number: number }; registration: { team: { name: string } }; tournament: { id: string; name: string } };
  type R = { id: string; reason: keyof typeof reportReasonLabel; description: string; evidence_urls: string[]; status: string; decision: string | null; target_type: string; created_at: string; tournament: { id: string; name: string } };
  return (
    <div className="grid gap-10">
      <PageHeader title="Ocorrências" description="Contestações de resultados e denúncias nos seus campeonatos. Todas as decisões ficam registradas." />
      <Section title="Contestações">
        {(disputes ?? []).length ? (
          <ul className="grid gap-3">
            {(disputes as unknown as D[]).map((d) => (
              <li key={d.id} className="rounded-3xl bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium"><Link href={`/organizador/campeonatos/${d.tournament.id}?tab=resultados`} className="hover:text-primary-text">{d.tournament.name}</Link> · Queda {d.match.number} · {d.registration.team.name}</p>
                  <span className="text-xs text-muted-foreground">{formatRelative(d.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{d.reason}</p>
                <Evidence urls={d.evidence_urls} />
                {d.status === "open" ? <div className="mt-3"><DisputeDecision id={d.id} /></div>
                  : <p className="mt-3 text-xs"><span className={d.status === "accepted" ? "text-success" : "text-destructive"}>{d.status === "accepted" ? "Aceita" : "Recusada"}</span> · {d.resolution}</p>}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={ShieldCheck} title="Nenhuma contestação" />}
      </Section>
      <Section title="Denúncias">
        {(reports ?? []).length ? (
          <ul className="grid gap-3">
            {(reports as unknown as R[]).map((r) => (
              <li key={r.id} className="rounded-3xl bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{reportReasonLabel[r.reason]} · {r.tournament.name}</p>
                  <span className="text-xs text-muted-foreground">{r.status} · {formatRelative(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                <Evidence urls={r.evidence_urls} />
                {["open", "in_review"].includes(r.status) ? <div className="mt-3"><ReportDecision id={r.id} /></div> : <p className="mt-3 text-xs text-muted-foreground">Decisão: {r.decision}</p>}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={ShieldCheck} title="Nenhuma denúncia" />}
      </Section>
    </div>
  );
}

function Evidence({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
      {urls.map((u, i) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-primary-text hover:underline">Evidência {i + 1}</a></li>)}
    </ul>
  );
}
