import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Settings2, Star, StarOff, Trophy } from "lucide-react";
import { DemoBadge, EmptyState, PageHeader, StatusBadge } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { SearchBox } from "@/app/(site)/equipes/search-box";
import { createClient } from "@/lib/supabase/server";
import { moderateTournament, reviewPaidRequest } from "@/lib/actions/admin";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Campeonatos · Admin" };

export default async function AdminTournaments({ searchParams }: PageProps<"/admin/campeonatos">) {
  const { q, pagos } = (await searchParams) as { q?: string; pagos?: string };
  const supabase = await createClient();
  let query = supabase.from("tournaments").select("*, organizer:organizers(name)").order("created_at", { ascending: false }).limit(150);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  if (pagos) query = query.eq("paid_request_status", "requested");
  const { data } = await query;
  const list = (data ?? []) as (Tournament & { organizer: { name: string } })[];
  return (
    <div className="grid gap-4">
      <PageHeader title="Campeonatos" description="Ocultar, destacar (destaque patrocinado) e analisar pedidos de inscrição paga." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Buscar campeonato" defaultValue={q} />
        <Link href={pagos ? "?" : "?pagos=1"} className="text-sm text-primary-text hover:underline">{pagos ? "Mostrar todos" : "Só pedidos de inscrição paga"}</Link>
      </div>
      {list.length ? (
        <ul className="divide-y rounded-3xl bg-card">
          {list.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  <Link href={`/campeonatos/${t.slug}`} className="hover:text-primary-text">{t.name}</Link>
                  <StatusBadge status={t.status} />{t.is_demo && <DemoBadge />}
                  {t.featured && <Star className="size-3.5 fill-primary text-primary-text" aria-label="Em destaque" />}
                  {t.hidden_by_admin && <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-semibold uppercase text-destructive">oculto</span>}
                </p>
                <p className="text-xs text-muted-foreground">{t.organizer?.name} · {formatDateTime(t.starts_at)}{t.entry_type === "paid" && ` · pago ${formatMoney(t.entry_fee_cents)} (${t.paid_request_status})`}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.paid_request_status === "requested" && (
                  <>
                    <ActionButton action={reviewPaidRequest.bind(null, t.id, true)} size="sm" reason={{ label: "Observação (validação jurídica, provedor…)", required: true }} confirm={{ title: "Habilitar inscrição paga?" }}>Habilitar pago</ActionButton>
                    <ActionButton action={reviewPaidRequest.bind(null, t.id, false)} variant="outline" size="sm" reason={{ label: "Motivo da recusa", required: true }} confirm={{ title: "Recusar pedido?" }}>Recusar</ActionButton>
                  </>
                )}
                <ActionButton action={moderateTournament.bind(null, t.id, t.hidden_by_admin, !t.featured)} variant="ghost" size="sm" ariaLabel={t.featured ? "Remover destaque" : "Destacar"}>
                  {t.featured ? <StarOff /> : <Star />}<span className="hidden sm:inline">{t.featured ? "Remover destaque" : "Destacar"}</span>
                </ActionButton>
                {t.hidden_by_admin ? (
                  <ActionButton action={moderateTournament.bind(null, t.id, false, t.featured)} variant="outline" size="sm"><Eye /> Reexibir</ActionButton>
                ) : (
                  <ActionButton action={moderateTournament.bind(null, t.id, true, false)} variant="ghost" size="sm" reason={{ label: "Motivo (visível ao organizador)", required: true }} confirm={{ title: `Ocultar ${t.name}?`, destructive: true }}><EyeOff /> Ocultar</ActionButton>
                )}
                <Link href={`/organizador/campeonatos/${t.id}`} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="size-4" /> Gerir</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Trophy} title="Nenhum campeonato" />}
    </div>
  );
}
