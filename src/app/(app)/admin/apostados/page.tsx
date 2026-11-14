import type { Metadata } from "next";
import Link from "next/link";
import { Swords } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { WAGER_SELECT, sideCost, wagerPrize, wagerStatusLabel, type Wager } from "@/lib/wagers";
import { formatMoney, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Apostados · Admin" };

/** What the mediator must do next on each wager. */
function todo(w: Wager) {
  if (w.status === "accepted") return `Conferir Pix (${[!w.a_paid_at && "lado A", !w.b_paid_at && "lado B"].filter(Boolean).join(" e ")}) · ${formatMoney(sideCost(w))} cada`;
  if (w.status === "paid") return "Liberar a sala (ou esperar o lado A liberar)";
  if (w.status === "disputed") return "Decidir a disputa";
  if (w.status === "finished" && !w.paid_out_at) return `Pagar ${formatMoney(wagerPrize(w))} ao vencedor`;
  return null;
}

export default async function AdminWagers() {
  const supabase = await createClient();
  const { data } = await supabase.from("wagers").select(WAGER_SELECT).neq("status", "cancelled").order("created_at", { ascending: false }).limit(200);
  const all = (data ?? []) as Wager[];
  const pending = all.filter((w) => todo(w));
  const settled = all.filter((w) => w.status === "finished" && w.paid_out_at);
  const fees = settled.reduce((s, w) => s + sideCost(w) * 2 - wagerPrize(w), 0);
  return (
    <div className="grid gap-6">
      <PageHeader title="Apostados" description={`Mediação. ${settled.length} pagos · taxas acumuladas ${formatMoney(fees)}.`} />
      {pending.length ? (
        <ul className="divide-y rounded-3xl bg-card">
          {pending.map((w) => (
            <li key={w.id}>
              <Link href={`/apostados/${w.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40">
                <span className="font-heading text-lg">X{w.team_size}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">#{w.code} · {todo(w)}</span>
                  <span className="block text-xs text-muted-foreground">{wagerStatusLabel[w.status]} · {formatRelative(w.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Swords} title="Nada para mediar agora" />}
      <p className="text-xs text-muted-foreground">Chave Pix, taxa de mediação e o liga/desliga dos apostados ficam em Configurações.</p>
    </div>
  );
}
