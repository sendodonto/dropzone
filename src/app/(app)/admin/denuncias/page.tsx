import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { ReportDecision } from "@/components/organizer/decision-buttons";
import { createClient } from "@/lib/supabase/server";
import { formatRelative, reportReasonLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Denúncias · Admin" };

const targetHref: Record<string, (id: string) => string> = {
  tournament: () => "#", team: () => "#", user: () => "#", match: () => "#",
};

export default async function AdminReports({ searchParams }: PageProps<"/admin/denuncias">) {
  const { todas } = (await searchParams) as { todas?: string };
  const supabase = await createClient();
  let q = supabase.from("reports").select("*, reporter:profiles!reports_reporter_id_fkey(username), resolver:profiles!reports_resolved_by_fkey(username), tournament:tournaments(name, slug)")
    .order("created_at", { ascending: false }).limit(100);
  if (!todas) q = q.in("status", ["open", "in_review"]);
  const { data } = await q;
  type R = { id: string; target_type: string; target_id: string; reason: keyof typeof reportReasonLabel; description: string; evidence_urls: string[]; status: string; decision: string | null; created_at: string; reporter: { username: string }; resolver: { username: string } | null; tournament: { name: string; slug: string } | null };
  const list = (data ?? []) as unknown as R[];
  // Resolve target names for context.
  const ids = (type: string) => list.filter((r) => r.target_type === type).map((r) => r.target_id);
  const [users, teams] = await Promise.all([
    ids("user").length ? supabase.from("profiles").select("id, username").in("id", ids("user")) : Promise.resolve({ data: [] }),
    ids("team").length ? supabase.from("teams").select("id, name, slug").in("id", ids("team")) : Promise.resolve({ data: [] }),
  ]);
  const label = (r: R) => {
    if (r.target_type === "user") { const u = (users.data ?? []).find((x: { id: string }) => x.id === r.target_id) as { username: string } | undefined; return u ? [`@${u.username}`, `/jogadores/${u.username}`] : ["usuário", "#"]; }
    if (r.target_type === "team") { const t = (teams.data ?? []).find((x: { id: string }) => x.id === r.target_id) as { name: string; slug: string } | undefined; return t ? [t.name, `/equipes/${t.slug}`] : ["equipe", "#"]; }
    return r.tournament ? [r.tournament.name, `/campeonatos/${r.tournament.slug}`] : [r.target_type, targetHref[r.target_type]?.(r.target_id) ?? "#"];
  };
  return (
    <div className="grid gap-4">
      <PageHeader title="Denúncias" description="Todas as decisões são registradas e o denunciante é notificado."
        actions={<Link href={todas ? "?" : "?todas=1"} className="text-sm text-primary-text hover:underline">{todas ? "Só abertas" : "Ver todas"}</Link>} />
      {list.length ? (
        <ul className="grid gap-3">
          {list.map((r) => {
            const [name, href] = label(r);
            return (
              <li key={r.id} className="rounded-3xl bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p><span className="font-medium">{reportReasonLabel[r.reason]}</span> · <Link href={href} className="text-primary-text hover:underline">{name}</Link></p>
                  <span className={cn("text-xs", ["open", "in_review"].includes(r.status) ? "text-warning" : "text-muted-foreground")}>{r.status} · {formatRelative(r.created_at)} · por @{r.reporter?.username}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                {r.evidence_urls.length > 0 && <ul className="mt-1 flex gap-2 text-xs">{r.evidence_urls.map((u, i) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-primary-text hover:underline">Evidência {i + 1}</a></li>)}</ul>}
                {["open", "in_review"].includes(r.status) ? <div className="mt-3"><ReportDecision id={r.id} /></div>
                  : <p className="mt-2 text-xs text-muted-foreground">Decisão de @{r.resolver?.username}: {r.decision}</p>}
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={ShieldCheck} title="Nenhuma denúncia pendente" />}
    </div>
  );
}
