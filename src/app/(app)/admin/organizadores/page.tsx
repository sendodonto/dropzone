import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PauseCircle, ShieldCheck } from "lucide-react";
import { Avatar, DemoBadge, EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { createClient } from "@/lib/supabase/server";
import { setOrganizerPlan, setOrganizerStatus } from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Organizer } from "@/lib/types";

export const metadata: Metadata = { title: "Organizadores · Admin" };

export default async function AdminOrganizers({ searchParams }: PageProps<"/admin/organizadores">) {
  const { status } = (await searchParams) as { status?: string };
  const supabase = await createClient();
  let q = supabase.from("organizers").select("*, owner:profiles!organizers_owner_id_fkey(username), plan:plans(code), tournaments(count)").order("created_at", { ascending: false });
  if (status && ["pending", "approved", "suspended"].includes(status)) q = q.eq("status", status);
  const { data } = await q;
  const list = (data ?? []) as (Organizer & { owner: { username: string }; plan: { code: string } | null; tournaments: { count: number }[] })[];
  return (
    <div className="grid gap-4">
      <PageHeader title="Organizadores" />
      <div className="flex gap-2">
        {["", "pending", "approved", "suspended"].map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"} className={cn("rounded-md px-2.5 py-1 text-sm", (status ?? "") === s ? "bg-muted text-foreground" : "text-muted-foreground")}>
            {{ "": "Todos", pending: "Pendentes", approved: "Aprovados", suspended: "Suspensos" }[s]}
          </Link>
        ))}
      </div>
      {list.length ? (
        <ul className="divide-y rounded-3xl bg-card">
          {list.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar src={o.logo_url} name={o.name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  <Link href={`/organizadores/${o.slug}`} className="hover:text-primary-text">{o.name}</Link>
                  {o.is_official && <ShieldCheck className="size-4 text-primary-text" aria-label="Oficial" />}{o.is_demo && <DemoBadge />}
                  <span className={cn("rounded px-1.5 text-[10px] font-semibold uppercase", o.status === "approved" ? "bg-success/15 text-success" : o.status === "pending" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>{o.status}</span>
                </p>
                <p className="text-xs text-muted-foreground">@{o.owner?.username} · plano {o.plan?.code ?? "FREE"} · {o.tournaments?.[0]?.count ?? 0} campeonatos · desde {formatDate(o.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {o.status !== "approved" && <ActionButton action={setOrganizerStatus.bind(null, o.id, "approved")} size="sm"><CheckCircle2 /> Aprovar</ActionButton>}
                {o.status !== "suspended" && (
                  <ActionButton action={setOrganizerStatus.bind(null, o.id, "suspended")} variant="ghost" size="sm" reason={{ label: "Motivo da suspensão", required: true }} confirm={{ title: `Suspender ${o.name}?`, description: "O organizador perde acesso à gestão dos campeonatos.", destructive: true }}><PauseCircle /> Suspender</ActionButton>
                )}
                <ActionButton action={setOrganizerPlan.bind(null, o.id, o.plan?.code === "PRO" ? "FREE" : "PRO")} variant="outline" size="sm"
                  confirm={{ title: `Mudar plano para ${o.plan?.code === "PRO" ? "Free" : "Pro"}?`, description: "Cobrança de assinaturas ainda não está ativa; a alteração é manual." }}>
                  Plano → {o.plan?.code === "PRO" ? "Free" : "Pro"}
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={ShieldCheck} title="Nenhum organizador" />}
    </div>
  );
}
