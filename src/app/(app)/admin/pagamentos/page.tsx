import type { Metadata } from "next";
import { CircleDollarSign } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { createClient } from "@/lib/supabase/server";
import { recordPaymentStatus } from "@/lib/actions/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Pagamentos · Admin" };

const label = { pending: "Pendente", in_review: "Em análise", confirmed: "Confirmado", declined: "Recusado", refunded: "Reembolsado" } as const;

export default async function AdminPayments() {
  const supabase = await createClient();
  const [{ data: payments }, { data: refunds }, { data: enabled }] = await Promise.all([
    supabase.from("payments").select("*, payer:profiles(username), tournament:tournaments(name), events:payment_events(to_status, source, note, created_at)").order("created_at", { ascending: false }).limit(100),
    supabase.from("refunds").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("platform_settings").select("value").eq("key", "payments_enabled").maybeSingle(),
  ]);
  type P = { id: string; amount_cents: number; platform_fee_cents: number; status: keyof typeof label; provider: string; provider_ref: string | null; created_at: string; payer: { username: string }; tournament: { name: string } | null; events: { to_status: string; source: string; note: string | null; created_at: string }[] };
  const list = (payments ?? []) as unknown as P[];
  return (
    <div className="grid gap-8">
      <PageHeader title="Pagamentos" description="Estrutura pronta, transações reais desativadas." />
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Pagamentos reais: {enabled?.value === true ? "habilitados" : "desativados"}</p>
        <p className="mt-1 text-muted-foreground">
          Ativar exige: validação jurídica do modelo de inscrição/premiação, contrato com provedor compatível, adaptador em <code>src/lib/payments</code> e webhook
          que registra status com a chave de serviço. Nenhum dado de cartão é armazenado; toda mudança de status gera evento auditável.
        </p>
      </div>
      <Section title="Transações">
        {list.length ? (
          <ul className="divide-y rounded-3xl bg-card text-sm">
            {list.map((p) => (
              <li key={p.id} className="grid gap-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{formatMoney(p.amount_cents)}</strong> · @{p.payer?.username} · {p.tournament?.name ?? "assinatura"} · {p.provider}{p.provider_ref && ` #${p.provider_ref}`}</span>
                  <span className="text-xs">{label[p.status]} · {formatDateTime(p.created_at)}</span>
                </div>
                <ul className="text-xs text-muted-foreground">{p.events.map((e, i) => <li key={i}>{formatDateTime(e.created_at)} → {e.to_status} ({e.source}){e.note && `: ${e.note}`}</li>)}</ul>
                {p.status === "in_review" && (
                  <div className="flex gap-2">
                    <ActionButton action={recordPaymentStatus.bind(null, p.id, "confirmed")} size="sm" reason={{ label: "Comprovação (obrigatória)", required: true }} confirm={{ title: "Confirmar pagamento?" }}>Confirmar</ActionButton>
                    <ActionButton action={recordPaymentStatus.bind(null, p.id, "declined")} variant="outline" size="sm" reason={{ label: "Motivo", required: true }} confirm={{ title: "Recusar pagamento?" }}>Recusar</ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={CircleDollarSign} title="Nenhuma transação registrada" description="Aparecerão aqui quando um provedor de pagamento for integrado." />}
      </Section>
      <Section title="Reembolsos">
        {(refunds ?? []).length ? (
          <ul className="divide-y rounded-3xl bg-card text-sm">
            {(refunds as { id: string; amount_cents: number; reason: string; status: string; created_at: string }[]).map((r) => (
              <li key={r.id} className="flex justify-between p-3"><span>{formatMoney(r.amount_cents)} · {r.reason}</span><span className="text-xs">{r.status} · {formatDateTime(r.created_at)}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nenhum reembolso.</p>}
      </Section>
    </div>
  );
}
