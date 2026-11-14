import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPlayerNames, getWagerSettings } from "@/lib/wager-queries";
import { WAGER_SELECT, roundsLabel, wagerPrize, wagerStatusLabel, type Wager } from "@/lib/wagers";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Apostados", description: "Desafios X1 a X4 de Free Fire valendo dinheiro, mediados. Só para maiores de 18." };

export default async function WagersPage({ searchParams }: PageProps<"/apostados">) {
  const { x } = (await searchParams) as { x?: string };
  const size = ["1", "2", "3", "4"].includes(x ?? "") ? Number(x) : null;
  const [viewer, settings] = await Promise.all([getViewer(), getWagerSettings()]);
  const supabase = await createClient();
  let open = supabase.from("wagers").select(WAGER_SELECT).eq("status", "open").order("created_at", { ascending: false }).limit(60);
  if (size) open = open.eq("team_size", size);
  const [{ data: openData }, { data: recentData }] = await Promise.all([
    open,
    supabase.from("wagers").select(WAGER_SELECT).in("status", ["accepted", "paid", "live", "disputed", "finished"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const list = (openData ?? []) as Wager[];
  const recent = (recentData ?? []) as Wager[];
  const names = await getPlayerNames([...list, ...recent].map((w) => w.creator_id));

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader title="Apostados" description="Desafios X1 a X4 valendo dinheiro, com mediação. Só para maiores de 18 anos."
        actions={settings.enabled && <Link href={viewer ? "/apostados/novo" : "/entrar?next=/apostados/novo"} className={buttonVariants()}><Plus /> Criar apostado</Link>} />

      {!settings.enabled && <p className="rounded-2xl bg-warning/10 p-4 text-sm">Os apostados estão pausados no momento.</p>}

      <ol className="grid gap-3 text-sm sm:grid-cols-4">
        {[["1", "Crie ou aceite", "Escolha X1 a X4, mapa, formato e o valor por jogador."],
          ["2", "Pix ao mediador", "Os dois lados pagam. A sala só sai depois dos dois Pix."],
          ["3", "Joguem", "ID e senha aparecem só para os dois lados."],
          ["4", "Resultado", "Os capitães confirmam quem venceu e o mediador paga o vencedor."]].map(([n, t, d]) => (
          <li key={n} className="rounded-3xl bg-card p-4">
            <span className="font-heading text-sm text-primary-text">{n.padStart(2, "0")}</span>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="mt-0.5 text-muted-foreground">{d}</p>
          </li>
        ))}
      </ol>

      <nav aria-label="Modalidade" className="flex flex-wrap gap-2">
        {[["", "Todos"], ["1", "X1"], ["2", "X2"], ["3", "X3"], ["4", "X4"]].map(([v, label]) => (
          <Link key={v} href={v ? `?x=${v}` : "/apostados"} aria-current={String(size ?? "") === v ? "page" : undefined}
            className={cn("inline-flex min-h-10 items-center rounded-full px-4 text-sm", String(size ?? "") === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="abertos" className="grid gap-4">
        <h2 id="abertos" className="text-2xl">Abertos para aceitar</h2>
        {list.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((w) => (
              <li key={w.id}>
                <Link href={`/apostados/${w.id}`} className="press grid gap-2 rounded-3xl bg-card p-5 hover:bg-accent">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-heading text-2xl">X{w.team_size}</span>
                    <span className="text-xs text-muted-foreground">#{w.code} · {formatRelative(w.created_at)}</span>
                  </div>
                  <p className="text-sm">{w.map} · {roundsLabel(w.rounds)}</p>
                  <p className="text-sm"><strong>{formatMoney(w.stake_cents)}</strong> por jogador · vencedor leva <strong>{formatMoney(wagerPrize(w))}</strong></p>
                  <p className="truncate text-xs text-muted-foreground">por {w.a_team?.name ?? names.get(w.creator_id) ?? "jogador"}{w.rules ? ` · ${w.rules}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Swords} title="Nenhum apostado aberto" description="Crie o primeiro e espere alguém aceitar." />
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recentes" className="grid gap-4">
          <h2 id="recentes" className="text-2xl">Em andamento e recentes</h2>
          <ul className="divide-y rounded-3xl bg-card">
            {recent.map((w) => (
              <li key={w.id}>
                <Link href={`/apostados/${w.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40">
                  <span className="font-heading text-lg">X{w.team_size}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">#{w.code} · {w.map} · {formatMoney(w.stake_cents)} por jogador</span>
                  <span className="text-xs font-semibold text-muted-foreground">{wagerStatusLabel[w.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Apostados são disputas entre jogadores maiores de 18 anos, mediadas pela plataforma. O pagamento é feito por Pix ao mediador, fora do site.
        Plataforma independente, sem vínculo com a Garena.
      </p>
    </div>
  );
}
