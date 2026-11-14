import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock, Globe2, KeyRound, Lock, Map, Settings2, ShieldCheck, Trophy, Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, DemoBadge, EmptyState, RegistrationBadge, Section, StatusBadge } from "@/components/shared/ui-bits";
import { CopyButton, Countdown } from "@/components/shared/client-bits";
import { ActionButton } from "@/components/shared/action-button";
import { RichText } from "@/components/shared/rich-text";
import { StandingsTable } from "@/components/tournament/standings-table";
import { RegisterPanel, type EligibleTeam } from "@/components/tournament/register-panel";
import { DisputeDialog, ReportDialog } from "@/components/tournament/dialogs";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMatchResults, getTournamentBundle, getTournamentBySlug, type RegistrationRow } from "@/lib/tournament";
import { getStandings } from "@/lib/queries";
import { withdrawRegistration } from "@/lib/actions/tournaments";
import { entryLabel, formatDateTime, formatMoney, formatPoints, formatTime, modeLabel, platformLabel } from "@/lib/format";
import { TIEBREAKER_LABEL } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { Match, MatchRoom, Tiebreaker } from "@/lib/types";

const TABS = [
  { id: "visao", label: "Visão geral" },
  { id: "equipes", label: "Equipes" },
  { id: "partidas", label: "Partidas" },
  { id: "classificacao", label: "Classificação" },
  { id: "regulamento", label: "Regulamento" },
] as const;

export async function generateMetadata({ params }: PageProps<"/campeonatos/[slug]">): Promise<Metadata> {
  const t = await getTournamentBySlug((await params).slug);
  if (!t) return { title: "Campeonato não encontrado" };
  return {
    title: t.name,
    description: t.description?.slice(0, 160) ?? `${modeLabel[t.mode]} · ${t.organizer.name}`,
    openGraph: t.cover_url ? { images: [t.cover_url] } : undefined,
    robots: t.visibility === "public" ? undefined : { index: false },
  };
}

export default async function TournamentPage({ params, searchParams }: PageProps<"/campeonatos/[slug]">) {
  const { slug } = await params;
  const sp = (await searchParams) as { tab?: string };
  const t = await getTournamentBySlug(slug);
  if (!t) notFound();
  const tab = TABS.some((x) => x.id === sp.tab) ? sp.tab! : t.status === "live" || t.status === "finished" ? "classificacao" : "visao";

  const viewer = await getViewer();
  const supabase = await createClient();
  const [b, standings, results] = await Promise.all([getTournamentBundle(t), getStandings(t.id), getMatchResults(t.id)]);
  const canManage = !!viewer && (viewer.isAdmin || viewer.organizers.some((o) => o.id === t.organizer_id));

  const active = b.registrations.filter((r) => r.status === "confirmed" || r.status === "pending");
  const confirmed = b.registrations.filter((r) => r.status === "confirmed");
  const mine = viewer ? b.registrations.filter((r) => r.team.captain_id === viewer.id || r.players.some((p) => p.user_id === viewer.id)) : [];
  const myActive = mine.find((r) => r.status === "pending" || r.status === "confirmed");
  const regOpen = t.status === "registration_open"
    && (!t.registration_opens_at || new Date(t.registration_opens_at) <= new Date())
    && (!t.registration_closes_at || new Date(t.registration_closes_at) > new Date());
  const full = active.length >= t.max_teams;

  // Squads the viewer captains that are not yet in this tournament.
  let eligible: EligibleTeam[] = [];
  if (viewer && regOpen && !myActive) {
    const { data } = await supabase.from("teams")
      .select("id, name, tag, captain_id, members:team_members(user_id, role, profile:profiles(username, display_name))")
      .eq("captain_id", viewer.id);
    const registered = new Set(b.registrations.filter((r) => ["pending", "confirmed"].includes(r.status)).map((r) => r.team.id));
    eligible = ((data ?? []) as unknown as { id: string; name: string; tag: string; members: { user_id: string; role: string; profile: { username: string; display_name: string } }[] }[])
      .filter((x) => !registered.has(x.id) && x.members.length >= t.team_size)
      .map((x) => ({ id: x.id, name: x.name, tag: x.tag, members: x.members
        .sort((a, c) => (a.role === "captain" ? -1 : c.role === "captain" ? 1 : 0))
        .map((m) => ({ user_id: m.user_id, username: m.profile.username, display_name: m.profile.display_name, captain: m.role === "captain" })) }));
  }

  const champion = t.status === "finished" ? standings[0] : undefined;

  return (
    <div>
      {(t.status === "live") && <RealtimeRefresh table="matches" filter={`tournament_id=eq.${t.id}`} />}
      {/* ── Banner ── */}
      <section className="on-color relative overflow-hidden bg-primary">
        {t.cover_url && (
          <div className="absolute inset-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.cover_url} alt="" className="size-full object-cover opacity-25 mix-blend-luminosity" />
          </div>
        )}
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pt-10 pb-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-end lg:pt-16 lg:pb-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={t.status} />
              {t.is_demo && <DemoBadge />}
              {t.visibility === "private" && <span className="text-xs font-medium">Privado</span>}
            </div>
            <h1 className="mt-3 max-w-[18ch] text-[2.1rem] leading-[1] text-balance sm:text-5xl">{t.name}</h1>
            <Link href={`/organizadores/${t.organizer.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Avatar src={t.organizer.logo_url} name={t.organizer.name} size="sm" />
              {t.organizer.name}
              {t.organizer.is_official && <ShieldCheck className="size-4 text-primary-text" aria-label="Organizador oficial" />}
            </Link>
            <dl className="mt-7 grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap">
              <Fact label="Início" value={formatDateTime(t.starts_at)} />
              <Fact label="Vagas" value={`${active.length}/${t.max_teams}`} />
              <Fact label="Modalidade" value={modeLabel[t.mode]} />
              <Fact label="Inscrição" value={t.entry_type === "external" ? `${formatMoney(t.entry_fee_cents)} por equipe` : t.entry_type === "paid" ? formatMoney(t.entry_fee_cents) : entryLabel[t.entry_type]} />
              <Fact label="Premiação" value={t.prize_pool_cents ? formatMoney(t.prize_pool_cents) : t.prize_description ? "Ver detalhes" : "Sem premiação"} />
            </dl>
          </div>

          {/* Action card */}
          <div className="grid gap-3 lg:pb-1">
            {canManage && (
              <Link href={`/organizador/campeonatos/${t.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white")}><Settings2 /> Gerenciar campeonato</Link>
            )}
            {champion && (
              <div className="flex items-center gap-3">
                <div><p className="text-xs text-muted-foreground">Campeão</p><p className="font-heading text-xl">{champion.team_name}</p></div>
              </div>
            )}
            {t.status === "cancelled" && <p className="text-sm text-muted-foreground">Campeonato cancelado{t.cancel_reason ? `: ${t.cancel_reason}` : "."}</p>}
            {myActive ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Seu squad: <strong>{myActive.team.name}</strong></span>
                  <RegistrationBadge status={myActive.status} />
                </div>
                {t.status !== "finished" && t.status !== "cancelled" && <p className="text-xs text-muted-foreground">Começa em <Countdown to={t.starts_at} done="andamento" className="font-medium text-foreground" /></p>}
                {myActive.team.captain_id === viewer?.id && ["registration_open", "registration_closed"].includes(t.status) && (
                  <ActionButton action={withdrawRegistration.bind(null, myActive.id)} variant="ghost" size="sm"
                    confirm={{ title: "Cancelar inscrição?", description: "A vaga será liberada para outro squad.", destructive: true, confirmLabel: "Cancelar inscrição" }}>
                    Cancelar inscrição
                  </ActionButton>
                )}
              </div>
            ) : regOpen ? (
              t.entry_type === "paid" ? (
                <p className="text-sm text-muted-foreground">Inscrições pagas ainda não estão disponíveis na plataforma.</p>
              ) : full ? (
                <p className="text-sm text-muted-foreground">Vagas esgotadas.</p>
              ) : viewer ? (
                <RegisterPanel onColor tournamentId={t.id} teams={eligible} teamSize={t.team_size} reservesAllowed={t.reserves_allowed} isPrivate={t.visibility === "private"} />
              ) : (
                <Link href={`/entrar?next=/campeonatos/${t.slug}`} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full bg-white text-primary hover:bg-white/90")}>Entrar para se inscrever</Link>
              )
            ) : !champion && t.status !== "cancelled" && (
              <p className="text-sm text-muted-foreground">
                {t.status === "registration_open" && t.registration_opens_at && new Date(t.registration_opens_at) > new Date()
                  ? <>Inscrições abrem em <Countdown to={t.registration_opens_at} /></>
                  : t.status === "live"
                    ? <Link href="?tab=classificacao" scroll={false} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full bg-white text-primary hover:bg-white/90")}>Ver classificação ao vivo</Link>
                    : "Inscrições encerradas."}
              </p>
            )}
            {t.entry_type === "external" && t.payment_instructions && (regOpen || myActive) && (
              <div className="mt-4 rounded-2xl bg-white/12 p-4 text-sm">
                <p className="font-semibold">Pagamento da inscrição: {formatMoney(t.entry_fee_cents)} por equipe</p>
                <p className="mt-1 whitespace-pre-line">{t.payment_instructions}</p>
                <p className="mt-2 text-xs opacity-80">Pago direto ao organizador, fora da plataforma. A vaga é confirmada quando o organizador aprovar a inscrição.</p>
              </div>
            )}
            {t.requires_approval && regOpen && !myActive && <p className="mt-2 text-xs text-muted-foreground">Inscrições passam por aprovação do organizador.</p>}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="material-bar sticky top-14 z-30 border-b">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6" aria-label="Seções do campeonato">
          <ul className="scrollbar-none scroll-fade -mb-px flex gap-1 overflow-x-auto">
            {TABS.map((x) => (
              <li key={x.id}>
                <Link href={`?tab=${x.id}`} scroll={false} aria-current={tab === x.id ? "page" : undefined}
                  className={cn("block border-b-2 px-3 py-3 text-sm whitespace-nowrap transition-colors", tab === x.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  {x.label}{x.id === "equipes" && ` (${active.length})`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "visao" && <Overview t={t} b={b} confirmed={confirmed.length} />}
        {tab === "equipes" && <TeamsTab regs={b.registrations} showPending={canManage || t.requires_approval} />}
        {tab === "partidas" && (
          <MatchesTab matches={b.matches} rooms={b.rooms} roomStatus={b.roomStatus} results={results} regs={b.registrations}
            myReg={myActive?.status === "confirmed" ? myActive : undefined} canManage={canManage} />
        )}
        {tab === "classificacao" && (
          <div className="grid gap-4">
            {t.status === "live" && <RealtimeRefresh table="match_results" filter={`tournament_id=eq.${t.id}`} />}
            <p className="text-sm text-muted-foreground">
              {t.status === "finished" ? "Classificação final." : "Atualizada automaticamente a cada resultado publicado."} Desempate: {(b.scoring?.tiebreakers ?? []).map((x) => TIEBREAKER_LABEL[x as Tiebreaker]).join(" → ")}.
            </p>
            <StandingsTable rows={standings} totalMatches={b.matches.filter((m) => m.status !== "cancelled").length} highlight={new Set(mine.map((m) => m.id))} />
          </div>
        )}
        {tab === "regulamento" && <RulesTab rules={b.rules} scoring={b.scoring} disputeWindow={t.dispute_window_minutes} />}
        <div className="mt-10 flex justify-end border-t pt-4">
          {viewer && <ReportDialog targetType="tournament" targetId={t.id} tournamentId={t.id} label="Denunciar campeonato" />}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

type Bundle = Awaited<ReturnType<typeof getTournamentBundle>>;

function Overview({ t, b, confirmed }: { t: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>; b: Bundle; confirmed: number }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="grid content-start gap-10">
        {b.announcements.length > 0 && (
          <Section title="Avisos do organizador">
            <ul className="grid gap-3">
              {b.announcements.map((a) => (
                <li key={a.id} className={cn("rounded-3xl bg-card p-4", a.pinned && "border-primary/40")}>
                  <p className="flex items-center gap-2 font-medium">{a.title}{a.pinned && <span className="text-xs font-medium text-primary-text">Fixado</span>}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
        <Section title="Sobre">
          {t.description ? <RichText text={t.description} /> : <p className="text-sm text-muted-foreground">O organizador não adicionou descrição.</p>}
        </Section>
        <Section title="Cronograma">
          <ol className="relative grid gap-4 border-l pl-5">
            {t.registration_opens_at && <TimelineItem when={t.registration_opens_at} label="Abertura das inscrições" />}
            {t.registration_closes_at && <TimelineItem when={t.registration_closes_at} label="Encerramento das inscrições" />}
            <TimelineItem when={t.starts_at} label="Início do campeonato" highlight />
            {b.matches.map((m) => <TimelineItem key={m.id} when={m.scheduled_at} label={`Queda ${m.number} · ${m.map}`} />)}
          </ol>
        </Section>
      </div>
      <div className="grid content-start gap-10">
        <Section title="Informações">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm">
            {[
              ["Modalidade", modeLabel[t.mode]], ["Plataforma", platformLabel[t.platform]], ["Região", t.region],
              ["Quedas", String(t.matches_count)], ["Jogadores/equipe", String(t.team_size)], ["Reservas", String(t.reserves_allowed)],
              ["Confirmadas", `${confirmed}/${t.max_teams}`], ["Aprovação", t.requires_approval ? "Manual" : "Automática"],
            ].map(([k, v]) => (
              <div key={k} className="bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
            ))}
          </dl>
        </Section>
        <Section title="Premiação">
          {t.prize_description && <p className="text-sm text-muted-foreground">{t.prize_description}</p>}
          {b.prizes.length ? (
            <ul className="divide-y rounded-3xl bg-card">
              {b.prizes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <Trophy className={cn("size-5", p.position === 1 ? "text-primary-text" : "text-muted-foreground")} aria-hidden />
                  <div className="min-w-0 flex-1"><p className="font-medium">{p.label}</p>{p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}</div>
                  {p.amount_cents > 0 && <span className="font-heading font-bold">{formatMoney(p.amount_cents)}</span>}
                </li>
              ))}
            </ul>
          ) : !t.prize_description && <p className="text-sm text-muted-foreground">Sem premiação anunciada.</p>}
          {(t.prize_pool_cents > 0 || b.prizes.some((p) => p.amount_cents > 0)) && (
            <p className="text-xs text-muted-foreground">Premiação anunciada e de responsabilidade do organizador.</p>
          )}
        </Section>
        {b.sponsors.length > 0 && (
          <Section title="Patrocinadores">
            <ul className="flex flex-wrap gap-2">
              {b.sponsors.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-3xl bg-card px-3 py-2 text-sm">
                  <Avatar src={s.logo_url} name={s.name} size="sm" />
                  {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="hover:text-primary-text">{s.name}</a> : s.name}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ when, label, highlight }: { when: string | null; label: string; highlight?: boolean }) {
  return (
    <li className="relative">
      <span className={cn("absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background", highlight ? "bg-primary" : "bg-muted-foreground")} aria-hidden />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{formatDateTime(when)}</p>
    </li>
  );
}

function TeamsTab({ regs, showPending }: { regs: RegistrationRow[]; showPending: boolean }) {
  const shown = regs.filter((r) => r.status === "confirmed" || (showPending && r.status === "pending"));
  if (!shown.length) return <EmptyState icon={Users} title="Nenhuma equipe inscrita ainda" description="Seja o primeiro squad a garantir a vaga." />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((r) => (
        <li key={r.id} className="rounded-3xl bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar src={r.team.logo_url} name={r.team.name} size="lg" />
            <div className="min-w-0 flex-1">
              <Link href={`/equipes/${r.team.slug}`} className="block truncate font-heading text-lg font-semibold hover:text-primary-text">{r.team.name}</Link>
              <p className="text-xs text-muted-foreground">[{r.team.tag}]</p>
            </div>
            {r.status === "pending" && <RegistrationBadge status="pending" />}
            {r.final_rank && <span className="font-heading text-xl font-bold text-primary-text">#{r.final_rank}</span>}
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {r.players.map((p) => (
              <li key={p.user_id}>
                <Link href={`/jogadores/${p.profile?.username}`} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs hover:text-primary-text">
                  {p.profile?.display_name ?? "Jogador"}{p.is_reserve && <span className="text-muted-foreground">(res.)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function MatchesTab({ matches, rooms, roomStatus, results, regs, myReg, canManage }: {
  matches: Match[]; rooms: MatchRoom[]; roomStatus: Bundle["roomStatus"]; results: Awaited<ReturnType<typeof getMatchResults>>;
  regs: RegistrationRow[]; myReg?: RegistrationRow; canManage: boolean;
}) {
  if (!matches.length) return <EmptyState icon={Map} title="Partidas ainda não definidas" description="As quedas aparecem quando o campeonato é publicado." />;
  const teamOf = new globalThis.Map(regs.map((r) => [r.id, r.team]));
  return (
    <ul className="grid gap-4">
      {matches.map((m) => {
        const room = rooms.find((r) => r.match_id === m.id);
        const status = roomStatus.find((r) => r.match_id === m.id);
        const res = results.filter((r) => r.match_id === m.id).sort((a, b) => a.placement - b.placement);
        const canDispute = myReg && m.results_status === "published" && m.dispute_deadline && new Date(m.dispute_deadline) > new Date();
        const roomLabel = m.status === "finished" ? "Partida encerrada" : m.status === "live" ? "Partida em andamento"
          : status?.published ? "Sala publicada" : "Sala ainda não publicada";
        return (
          <li key={m.id} className="overflow-hidden rounded-3xl bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b p-4">
              <span className="grid size-10 place-items-center rounded-lg bg-muted font-heading text-lg font-bold">{m.number}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Queda {m.number} · {m.map}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" aria-hidden />{formatDateTime(m.scheduled_at)}</p>
              </div>
              <span className={cn("text-xs font-semibold",
                m.status === "live" ? "text-foreground" : status?.published && m.status === "scheduled" ? "text-primary-text" : "text-muted-foreground")}>
                {roomLabel}
              </span>
            </div>

            {m.status !== "finished" && (
              <div className="p-4">
                {room && (!room.opens_at || new Date(room.opens_at) <= new Date() || canManage) ? (
                  <div className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4 text-primary-text" aria-hidden /> Dados da sala {canManage && !room.published && <span className="text-xs text-warning">(visível só para você — não publicada)</span>}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Credential label="ID da sala" value={room.room_code} />
                      {room.room_password && <Credential label="Senha" value={room.room_password} />}
                    </div>
                    {room.instructions && <p className="text-xs text-muted-foreground">{room.instructions}</p>}
                    {m.scheduled_at && new Date(m.scheduled_at) > new Date() && (
                      <p className="text-sm">Partida começa em <Countdown to={m.scheduled_at} className="font-heading text-lg font-bold text-primary-text" /></p>
                    )}
                  </div>
                ) : status?.published ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden />
                    {status.opens_at && new Date(status.opens_at) > new Date()
                      ? <>ID e senha liberados às {formatTime(status.opens_at)} para {status.audience === "all_participants" ? "participantes" : "equipes confirmadas"} (<Countdown to={status.opens_at} />).</>
                      : "Credenciais disponíveis apenas para as equipes autorizadas."}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Globe2 className="size-4" aria-hidden /> O organizador ainda não publicou a sala desta queda.</p>
                )}
              </div>
            )}

            {m.results_status === "published" && res.length > 0 && (
              <div className="border-t">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th scope="col" className="px-4 py-2">Pos.</th><th scope="col" className="px-4 py-2">Equipe</th>
                      <th scope="col" className="px-4 py-2 text-right">Abates</th><th scope="col" className="px-4 py-2 text-right">Pontos</th>
                    </tr></thead>
                    <tbody>
                      {res.map((r) => (
                        <tr key={r.id} className={cn("border-t", myReg?.id === r.registration_id && "bg-primary/[0.07]")}>
                          <td className="px-4 py-2 font-heading font-bold">{r.placement}º</td>
                          <td className="px-4 py-2">{teamOf.get(r.registration_id)?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{r.kills}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatPoints(r.total_points)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(canDispute || m.dispute_deadline) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
                    <span>{m.dispute_deadline && new Date(m.dispute_deadline) > new Date() ? <>Contestações até {formatDateTime(m.dispute_deadline)}</> : "Prazo de contestação encerrado"}</span>
                    {canDispute && <DisputeDialog matchId={m.id} registrationId={myReg!.id} matchNumber={m.number} />}
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2">
      <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="font-mono text-lg font-semibold tracking-wider">{value}</p></div>
      <CopyButton value={value} label={label} />
    </div>
  );
}

function RulesTab({ rules, scoring, disputeWindow }: { rules: string; scoring: Bundle["scoring"]; disputeWindow: number }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <Section title="Regulamento">
        {rules.trim() ? <RichText text={rules} /> : <p className="text-sm text-muted-foreground">Regulamento ainda não publicado.</p>}
      </Section>
      <Section title="Sistema de pontuação">
        {scoring ? (
          <div className="grid gap-4">
            <ul className="grid grid-cols-5 gap-1.5 text-center">
              {scoring.placement_points.map((p, i) => (
                <li key={i} className="rounded-lg bg-muted p-2"><p className="text-[11px] text-muted-foreground">{i + 1}º</p><p className="font-heading text-lg font-bold">{p}</p></li>
              ))}
            </ul>
            <p className="text-sm">Cada abate: <strong>{formatPoints(scoring.kill_points)} ponto(s)</strong>{scoring.max_bonus > 0 && <> · Bônus até <strong>{scoring.max_bonus}</strong> por queda</>}</p>
            <div>
              <p className="text-sm font-medium">Critérios de desempate</p>
              <ol className="mt-1 ml-5 list-decimal text-sm text-muted-foreground">
                {scoring.tiebreakers.map((tb) => <li key={tb}>{TIEBREAKER_LABEL[tb]}</li>)}
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">Contestações: até {disputeWindow} minutos após a publicação de cada queda.</p>
          </div>
        ) : <p className="text-sm text-muted-foreground">Pontuação não configurada.</p>}
      </Section>
    </div>
  );
}
