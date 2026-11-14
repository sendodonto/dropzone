import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, KeyRound, Trophy, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton } from "@/components/shared/action-button";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { CopyButton } from "@/components/shared/client-bits";
import { AcceptWagerForm, AdultConfirm } from "@/components/wagers/wager-forms";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCaptainTeams, getPlayerNames, getWagerSettings } from "@/lib/wager-queries";
import { cancelWager, markWagerPaid, markWagerPayout, reportWager, resolveWager, setWagerRoom } from "@/lib/actions/wagers";
import { WAGER_SELECT, roundsLabel, sideCost, wagerPrize, wagerStatusLabel, type Wager } from "@/lib/wagers";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Apostado" };

export default async function WagerPage({ params }: PageProps<"/apostados/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("wagers").select(WAGER_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const w = data as Wager;
  const [viewer, settings] = await Promise.all([getViewer(), getWagerSettings()]);
  const names = await getPlayerNames([...w.a_players, ...(w.b_players ?? [])]);
  const me = viewer?.id;
  const side: "a" | "b" | null = me && (me === w.creator_id || w.a_players.includes(me)) ? "a" : me && (me === w.b_captain_id || (w.b_players ?? []).includes(me)) ? "b" : null;
  const isCaptain = me === w.creator_id || me === w.b_captain_id;
  const isAdmin = !!viewer?.isAdmin;
  const { data: room } = side || isAdmin ? await supabase.from("wager_rooms").select("room_code, room_password").eq("wager_id", w.id).maybeSingle() : { data: null };
  const teams = viewer && w.status === "open" && !side ? await getCaptainTeams(viewer.id) : [];
  const sideName = (s: "a" | "b") => (s === "a" ? w.a_team?.name : w.b_team?.name) ?? names.get((s === "a" ? w.a_players : w.b_players ?? [])[0] ?? "") ?? `Lado ${s.toUpperCase()}`;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="grid gap-2">
        <p className="text-sm text-muted-foreground"><Link href="/apostados" className="hover:text-primary-text">Apostados</Link> · #{w.code}</p>
        <h1 className="text-4xl">X{w.team_size} · {w.map}</h1>
        <p className="text-sm"><span className="font-semibold">{wagerStatusLabel[w.status]}</span> · {roundsLabel(w.rounds)} · criado {formatDateTime(w.created_at)}</p>
      </header>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-3xl bg-background">
        {[["Por jogador", formatMoney(w.stake_cents)], ["Cada lado paga", formatMoney(sideCost(w))], ["Vencedor recebe", formatMoney(wagerPrize(w))]].map(([k, v]) => (
          <div key={k} className="bg-card p-4"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-heading text-xl">{v}</dd></div>
        ))}
      </dl>
      {w.rules && <p className="rounded-3xl bg-card p-4 text-sm"><span className="font-semibold">Regras:</span> {w.rules}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((s) => {
          const players = s === "a" ? w.a_players : w.b_players;
          const paid = s === "a" ? w.a_paid_at : w.b_paid_at;
          return (
            <section key={s} className={cn("rounded-3xl bg-card p-4", w.winner === s && "ring-2 ring-primary")}>
              <p className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lado {s.toUpperCase()}{side === s && " · você"}</span>
                {players && w.status !== "open" && w.status !== "cancelled" && <span>{paid ? "Pix confirmado" : "Pix pendente"}</span>}
              </p>
              <p className="mt-1 flex items-center gap-2 font-heading text-lg">{players ? sideName(s) : "Aguardando adversário"}{w.winner === s && <Trophy className="size-4 text-primary-text" aria-label="Vencedor" />}</p>
              {players && <p className="text-sm text-muted-foreground">{players.map((p) => names.get(p) ?? "jogador").join(", ")}</p>}
            </section>
          );
        })}
      </div>

      {/* ── What happens next, per status and role ── */}
      {w.status === "open" && (
        side ? (
          <div className="grid gap-2 rounded-3xl bg-card p-4 text-sm">
            <p>Aguardando alguém aceitar. Divulgue o link deste apostado.</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={`${site.url}/apostados/${w.id}`} label="Copiar link" />
              {me === w.creator_id && <ActionButton action={cancelWager.bind(null, w.id)} variant="outline" size="sm" confirm={{ title: "Cancelar este apostado?" }}><X /> Cancelar</ActionButton>}
            </div>
          </div>
        ) : !settings.enabled ? (
          <p className="rounded-2xl bg-warning/10 p-4 text-sm">Os apostados estão pausados no momento.</p>
        ) : !viewer ? (
          <Link href={`/entrar?next=/apostados/${w.id}`} className={buttonVariants({ size: "lg" })}>Entrar para aceitar</Link>
        ) : !viewer.profile.adult_confirmed_at ? (
          <AdultConfirm />
        ) : (
          <div className="rounded-3xl bg-card p-5"><AcceptWagerForm wagerId={w.id} size={w.team_size} teams={teams} meId={viewer.id} /></div>
        )
      )}

      {w.status === "accepted" && (side || isAdmin) && (
        <div className="grid gap-2 rounded-3xl bg-card p-5 text-sm">
          <p className="font-semibold">Pagamento: {formatMoney(sideCost(w))} por lado</p>
          <p className="whitespace-pre-line">{settings.paymentInstructions || "As instruções de pagamento serão enviadas pelo mediador."}</p>
          <p className="text-muted-foreground">Na mensagem do comprovante, informe o apostado <strong>#{w.code}</strong> e o seu lado. A sala é liberada quando os dois Pix forem confirmados.</p>
        </div>
      )}

      {w.status === "paid" && (isAdmin || me === w.creator_id) && (
        <div className="grid gap-3 rounded-3xl bg-card p-5">
          <p className="text-sm">Pix dos dois lados confirmados. Crie a sala no jogo e libere o ID e a senha:</p>
          <ActionForm action={setWagerRoom.bind(null, w.id)} idPrefix="wroom" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field name="room_code" label="ID da sala" required maxLength={30} autoComplete="off" />
            <Field name="room_password" label="Senha" maxLength={30} autoComplete="off" />
            <SubmitButton>Liberar sala</SubmitButton>
          </ActionForm>
        </div>
      )}
      {w.status === "paid" && side && me !== w.creator_id && <p className="rounded-3xl bg-card p-4 text-sm">Pix confirmados. Aguardando a sala ser liberada.</p>}

      {room && ["live", "disputed", "finished"].includes(w.status) && (
        <div className="grid gap-2 rounded-3xl bg-primary p-5 text-primary-foreground">
          <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" aria-hidden /> Dados da sala</p>
          <p className="font-heading text-2xl tabular-nums">ID {room.room_code}{room.room_password ? ` · senha ${room.room_password}` : ""}</p>
        </div>
      )}

      {w.status === "live" && isCaptain && (
        <div className="grid gap-3 rounded-3xl bg-card p-5">
          <p className="text-sm">Terminou? Informe o resultado. Se os dois capitães concordarem, o apostado é encerrado; se não, vai para o mediador.</p>
          {(side === "a" ? w.a_report : w.b_report) ? (
            <p className="text-sm text-muted-foreground">Você informou: vitória do lado {(side === "a" ? w.a_report : w.b_report)!.toUpperCase()}. Aguardando o outro capitão.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <ActionButton action={reportWager.bind(null, w.id, side!)} confirm={{ title: "Confirmar que o seu lado venceu?" }}><Trophy /> Nós vencemos</ActionButton>
              <ActionButton action={reportWager.bind(null, w.id, side === "a" ? "b" : "a")} variant="outline" confirm={{ title: "Confirmar que o outro lado venceu?" }}>Perdemos</ActionButton>
            </div>
          )}
        </div>
      )}

      {w.status === "disputed" && <p className="rounded-2xl bg-warning/10 p-4 text-sm">Os resultados informados não batem. Enviem prints ou vídeo ao mediador; a decisão fica registrada aqui.</p>}
      {w.status === "finished" && w.winner && (
        <p className="rounded-3xl bg-card p-4 text-sm">Vencedor: <strong>{sideName(w.winner)}</strong>. {w.paid_out_at ? `Prêmio pago em ${formatDateTime(w.paid_out_at)}.` : "O mediador paga o prêmio por Pix ao capitão vencedor."}{w.resolution ? ` Decisão do mediador: ${w.resolution}` : ""}</p>
      )}

      {/* ── Mediator controls ── */}
      {isAdmin && !["open", "cancelled"].includes(w.status) && (
        <section className="grid gap-3 rounded-3xl border border-dashed p-5" aria-label="Mediação">
          <p className="text-sm font-semibold">Mediação (admin)</p>
          <div className="flex flex-wrap gap-2">
            {w.status === "accepted" && !w.a_paid_at && <ActionButton action={markWagerPaid.bind(null, w.id, "a")} size="sm" confirm={{ title: `Confirmar Pix de ${formatMoney(sideCost(w))} do lado A?` }}><Check /> Pix lado A recebido</ActionButton>}
            {w.status === "accepted" && !w.b_paid_at && <ActionButton action={markWagerPaid.bind(null, w.id, "b")} size="sm" confirm={{ title: `Confirmar Pix de ${formatMoney(sideCost(w))} do lado B?` }}><Check /> Pix lado B recebido</ActionButton>}
            {["live", "disputed"].includes(w.status) && (["a", "b"] as const).map((s) => (
              <ActionButton key={s} action={resolveWager.bind(null, w.id, s)} variant="outline" size="sm"
                reason={{ label: "Motivo da decisão (fica registrado)", required: true }} confirm={{ title: `Dar a vitória ao lado ${s.toUpperCase()}?` }}>Vitória do lado {s.toUpperCase()}</ActionButton>
            ))}
            {w.status === "finished" && !w.paid_out_at && <ActionButton action={markWagerPayout.bind(null, w.id)} size="sm" confirm={{ title: `Registrar que ${formatMoney(wagerPrize(w))} foi pago ao vencedor?` }}><Check /> Prêmio pago</ActionButton>}
            {["accepted", "paid", "live", "disputed"].includes(w.status) && (
              <ActionButton action={cancelWager.bind(null, w.id)} variant="ghost" size="sm" confirm={{ title: "Cancelar e devolver os pagamentos?", destructive: true }}><X /> Cancelar apostado</ActionButton>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
