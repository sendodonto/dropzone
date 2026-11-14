import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Eye, EyeOff, ExternalLink, Pin, Radio, Trash2, UserX, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, DemoBadge, EmptyState, PageHeader, RegistrationBadge, Section, StatGroup, StatTile, StatusBadge } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { CopyButton } from "@/components/shared/client-bits";
import { StatusActions } from "@/components/organizer/status-actions";
import { RoomForm } from "@/components/organizer/room-form";
import { ResultsEditor } from "@/components/organizer/results-editor";
import { DisputeDecision } from "@/components/organizer/decision-buttons";
import { TournamentWizard } from "@/components/organizer/tournament-wizard";
import { StandingsTable } from "@/components/tournament/standings-table";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMatchResults, getTournamentBundle } from "@/lib/tournament";
import { getStandings } from "@/lib/queries";
import { deleteAnnouncement, postAnnouncement, reviewRegistration } from "@/lib/actions/tournaments";
import { publishResults, setMatchLive, setRoomPublished } from "@/lib/actions/matches";
import { auditLabel, formatDateTime, formatRelative, isoToLocalInput } from "@/lib/format";
import { DEFAULT_SCORING } from "@/lib/scoring";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import type { Organizer, Tournament } from "@/lib/types";

export const metadata: Metadata = { title: "Gerenciar campeonato" };

const TABS = [
  ["resumo", "Resumo"], ["editar", "Editar"], ["inscricoes", "Inscrições"], ["partidas", "Partidas e salas"],
  ["resultados", "Resultados"], ["avisos", "Avisos"], ["contestacoes", "Contestações"], ["historico", "Histórico"],
] as const;

export default async function ManageTournamentPage({ params, searchParams }: PageProps<"/organizador/campeonatos/[id]">) {
  const { id } = await params;
  const sp = (await searchParams) as { tab?: string; queda?: string };
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "resumo";
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: t } = await supabase.from("tournaments").select("*, organizer:organizers(*)").eq("id", id).maybeSingle<Tournament & { organizer: Organizer }>();
  if (!t || !(viewer.isAdmin || viewer.organizers.some((o) => o.id === t.organizer_id))) notFound();

  const [b, results, standings, settings, seasons, roomTargets] = await Promise.all([
    getTournamentBundle(t), getMatchResults(t.id), getStandings(t.id, true),
    supabase.from("platform_settings").select("value").eq("key", "payments_enabled").maybeSingle(),
    supabase.from("seasons").select("id, name").order("starts_at", { ascending: false }),
    supabase.from("match_room_targets").select("match_id, registration_id, match:matches!inner(tournament_id)").eq("match.tournament_id", id),
  ]);
  const targets = (roomTargets.data ?? []) as { match_id: string; registration_id: string }[];
  const confirmed = b.registrations.filter((r) => r.status === "confirmed");
  const pending = b.registrations.filter((r) => r.status === "pending");
  const scoring = {
    placementPoints: b.scoring?.placement_points ?? DEFAULT_SCORING.placementPoints,
    killPoints: Number(b.scoring?.kill_points ?? 1), maxBonus: b.scoring?.max_bonus ?? 0,
    tiebreakers: b.scoring?.tiebreakers ?? DEFAULT_SCORING.tiebreakers,
  };
  const teamsForMatch = confirmed.map((r) => ({ registration_id: r.id, name: r.team.name }));
  const publicUrl = `${site.url}/campeonatos/${t.slug}`;

  return (
    <div className="grid gap-6">
      <PageHeader meta={<span className="inline-flex items-center gap-2"><StatusBadge status={t.status} />{t.is_demo && <DemoBadge />}</span>} title={t.name}
        actions={<Link href={`/campeonatos/${t.slug}`} className={buttonVariants({ variant: "outline" })}><ExternalLink /> Ver página</Link>} />
      {t.hidden_by_admin && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Oculto pela moderação: {t.hidden_reason}</p>}

      <nav className="scrollbar-none scroll-fade -mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Seções de gestão">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm", tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}{k === "inscricoes" && pending.length > 0 && <span className="ml-1 rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">{pending.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "resumo" && (
        <div className="grid gap-8">
          <StatusActions t={t} />
          {t.entry_type === "paid" && (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Inscrição paga · habilitação: <strong className="text-foreground">{{ none: "não solicitada", requested: "em análise", approved: "aprovada", denied: "recusada" }[t.paid_request_status]}</strong>.
              {" "}Pagamentos reais permanecem desativados até validação jurídica e integração com provedor.
            </p>
          )}
          <StatGroup className="grid-cols-2 md:grid-cols-4">
            <StatTile label="Confirmadas" value={`${confirmed.length}/${t.max_teams}`} />
            <StatTile label="Pendentes" value={pending.length} />
            <StatTile label="Quedas publicadas" value={`${b.matches.filter((m) => m.results_status === "published").length}/${b.matches.length}`} />
            <StatTile label="Início" value={<span className="text-base">{formatDateTime(t.starts_at)}</span>} />
          </StatGroup>
          <Section title="Compartilhar">
            <div className="grid gap-2 rounded-3xl bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><code className="truncate text-muted-foreground">{publicUrl}</code><CopyButton value={publicUrl} label="Link" /></div>
              {t.visibility === "private" && t.invite_code && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><span>Código de convite: <strong className="font-mono">{t.invite_code}</strong></span><CopyButton value={t.invite_code} label="Código" /></div>
              )}
            </div>
          </Section>
          {standings.some((s) => Number(s.matches_played) > 0) && (
            <Section title="Classificação (inclui rascunhos)"><StandingsTable rows={standings} /></Section>
          )}
        </div>
      )}

      {tab === "editar" && (
        <div className="max-w-3xl rounded-3xl bg-card p-4 sm:p-6">
          {["finished", "cancelled"].includes(t.status) ? <p className="text-sm text-muted-foreground">Campeonatos encerrados não podem ser editados.</p> : (
            <TournamentWizard organizerId={t.organizer_id} organizerName={t.organizer.name} tournamentId={t.id} locked
              paymentsEnabled={settings.data?.value === true} seasons={seasons.data ?? []}
              defaults={{
                name: t.name, description: t.description, cover_url: t.cover_url, logo_url: t.logo_url, mode: t.mode, platform: t.platform,
                region: t.region, max_teams: t.max_teams, reserves_allowed: t.reserves_allowed, matches_count: t.matches_count,
                starts_at: isoToLocalInput(t.starts_at), registration_opens_at: isoToLocalInput(t.registration_opens_at),
                registration_closes_at: isoToLocalInput(t.registration_closes_at), requires_approval: t.requires_approval,
                visibility: t.visibility, entry_type: t.entry_type, entry_fee: t.entry_fee_cents / 100, prize_pool: t.prize_pool_cents / 100,
                prize_description: t.prize_description, dispute_window_minutes: t.dispute_window_minutes, rules: b.rules, season_id: t.season_id,
                placement_points: scoring.placementPoints, kill_points: scoring.killPoints, max_bonus: scoring.maxBonus, tiebreakers: scoring.tiebreakers,
                prizes: b.prizes.map((p) => ({ position: p.position, label: p.label, amount: p.amount_cents / 100 })),
                sponsors: b.sponsors.map((s) => ({ name: s.name, url: s.url ?? "" })),
              }} />
          )}
          {results.length > 0 && <p className="mt-4 text-xs text-muted-foreground">A pontuação fica congelada depois do primeiro resultado lançado.</p>}
        </div>
      )}

      {tab === "inscricoes" && (
        <div className="grid gap-8">
          {pending.length > 0 && (
            <Section title={`Aguardando aprovação (${pending.length})`}>
              <RegList regs={pending} pending />
            </Section>
          )}
          <Section title={`Confirmadas (${confirmed.length}/${t.max_teams})`}>
            {confirmed.length ? <RegList regs={confirmed} /> : <EmptyState icon={UserX} title="Nenhuma equipe confirmada" />}
          </Section>
          {b.registrations.some((r) => ["rejected", "removed", "withdrawn"].includes(r.status)) && (
            <Section title="Inativas">
              <ul className="grid gap-2 text-sm">
                {b.registrations.filter((r) => ["rejected", "removed", "withdrawn"].includes(r.status)).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2"><span className="font-medium">{r.team.name}</span><RegistrationBadge status={r.status} />{r.status_reason && <span className="text-muted-foreground">— {r.status_reason}</span>}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {tab === "partidas" && (
        b.matches.length ? (
          <ul className="grid gap-4">
            {b.matches.map((m) => {
              const room = b.rooms.find((r) => r.match_id === m.id);
              return (
                <li key={m.id} className="rounded-3xl bg-card">
                  <details open={m.status !== "finished" && (sp.queda ? sp.queda === String(m.number) : undefined)} className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
                      <span className="grid size-9 place-items-center rounded-lg bg-muted font-heading font-bold">{m.number}</span>
                      <span className="min-w-0 flex-1"><span className="font-medium">Queda {m.number} · {m.map}</span><span className="block text-xs text-muted-foreground">{formatDateTime(m.scheduled_at)}</span></span>
                      <span className={cn("text-xs font-semibold", room?.published ? "text-primary-text" : "text-muted-foreground")}>
                        {m.status === "finished" ? "Encerrada" : m.status === "live" ? "Em andamento" : room?.published ? "Sala publicada" : room ? "Sala salva (não publicada)" : "Sem sala"}
                      </span>
                    </summary>
                    <div className="grid gap-4 border-t p-4">
                      <RoomForm match={m} room={room} teams={teamsForMatch} targets={targets.filter((x) => x.match_id === m.id).map((x) => x.registration_id)} />
                      <div className="flex flex-wrap gap-2 border-t pt-3">
                        {room?.published && <ActionButton action={setRoomPublished.bind(null, m.id, false)} variant="ghost" size="sm"><EyeOff /> Ocultar sala</ActionButton>}
                        {room && !room.published && <ActionButton action={setRoomPublished.bind(null, m.id, true)} variant="outline" size="sm"><Eye /> Publicar sala</ActionButton>}
                        {m.status === "scheduled" && t.status === "live" && <ActionButton action={setMatchLive.bind(null, m.id)} variant="outline" size="sm"><Radio /> Marcar em andamento</ActionButton>}
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon={Radio} title="As quedas são criadas ao publicar o campeonato" />
      )}

      {tab === "resultados" && (
        t.status !== "live" ? (
          <EmptyState icon={Radio} title={t.status === "finished" ? "Campeonato finalizado" : "Inicie o campeonato para lançar resultados"}
            description={t.status === "finished" ? "Os resultados estão congelados." : "Use o botão Iniciar campeonato na aba Resumo."} />
        ) : (
          <div className="grid gap-4">
            {b.matches.map((m) => (
              <details key={m.id} className="rounded-3xl bg-card" open={m.results_status !== "published" && (!sp.queda || sp.queda === String(m.number))}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted font-heading font-bold">{m.number}</span>
                  <span className="flex-1 font-medium">Queda {m.number} · {m.map}</span>
                  <span className={cn("text-xs font-semibold", m.results_status === "published" ? "text-success" : results.some((r) => r.match_id === m.id) ? "text-warning" : "text-muted-foreground")}>
                    {m.results_status === "published" ? "Publicado" : results.some((r) => r.match_id === m.id) ? "Rascunho" : "Sem resultado"}
                  </span>
                </summary>
                <div className="grid gap-3 border-t p-4">
                  <ResultsEditor matchId={m.id} teams={teamsForMatch} scoring={scoring} published={m.results_status === "published"}
                    existing={results.filter((r) => r.match_id === m.id)} />
                  {m.results_status !== "published" && results.some((r) => r.match_id === m.id) && (
                    <ActionButton action={publishResults.bind(null, m.id)} className="justify-self-start"
                      confirm={{ title: `Publicar resultado da queda ${m.number}?`, description: `A classificação é atualizada, as equipes são notificadas e o prazo de contestação (${t.dispute_window_minutes} min) começa.` }}>
                      <Check /> Publicar resultado
                    </ActionButton>
                  )}
                </div>
              </details>
            ))}
          </div>
        )
      )}

      {tab === "avisos" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <Section title="Novo aviso">
            <div className="rounded-3xl bg-card p-4">
              <ActionForm action={postAnnouncement} resetOnSuccess>
                <input type="hidden" name="tournament_id" value={t.id} />
                <Field name="title" label="Título" required maxLength={120} />
                <Field name="body" label="Mensagem" textarea rows={4} required maxLength={4000} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" className="size-4 accent-[var(--primary)]" /> Fixar no topo</label>
                <SubmitButton className="justify-self-start">Publicar e notificar</SubmitButton>
              </ActionForm>
            </div>
          </Section>
          <Section title="Publicados">
            {b.announcements.length ? (
              <ul className="grid gap-2">
                {b.announcements.map((a) => (
                  <li key={a.id} className="rounded-3xl bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-medium">{a.pinned && <Pin className="size-3.5 text-primary-text" aria-label="Fixado" />}{a.title}</p>
                      <ActionButton action={deleteAnnouncement.bind(null, a.id)} variant="ghost" size="icon-sm" ariaLabel="Remover aviso" confirm={{ title: "Remover aviso?", destructive: true }}><Trash2 /></ActionButton>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelative(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Nenhum aviso publicado.</p>}
          </Section>
        </div>
      )}

      {tab === "contestacoes" && <DisputesTab tournamentId={t.id} />}
      {tab === "historico" && <HistoryTab tournamentId={t.id} />}
    </div>
  );
}

function RegList({ regs, pending }: { regs: Awaited<ReturnType<typeof getTournamentBundle>>["registrations"]; pending?: boolean }) {
  return (
    <ul className="divide-y rounded-3xl bg-card">
      {regs.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
          <Avatar src={r.team.logo_url} name={r.team.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{r.team.name} <span className="text-xs text-muted-foreground">[{r.team.tag}]</span></p>
            <p className="truncate text-xs text-muted-foreground">{r.players.map((p) => `${p.profile?.username}${p.is_reserve ? " (res.)" : ""}`).join(", ")}</p>
          </div>
          <div className="flex gap-1.5">
            {pending && <ActionButton action={reviewRegistration.bind(null, r.id, "confirmed")} size="sm"><Check /> Aprovar</ActionButton>}
            {pending ? (
              <ActionButton action={reviewRegistration.bind(null, r.id, "rejected")} variant="outline" size="sm"
                reason={{ label: "Justificativa (enviada ao squad)", required: true }} confirm={{ title: `Recusar ${r.team.name}?` }}><X /> Recusar</ActionButton>
            ) : (
              <ActionButton action={reviewRegistration.bind(null, r.id, "removed")} variant="ghost" size="sm"
                reason={{ label: "Justificativa da remoção (enviada ao squad)", required: true }}
                confirm={{ title: `Remover ${r.team.name}?`, description: "A remoção fica registrada no histórico.", destructive: true, confirmLabel: "Remover" }}><UserX /> Remover</ActionButton>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

async function DisputesTab({ tournamentId }: { tournamentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("disputes")
    .select("id, reason, evidence_urls, status, resolution, created_at, match:matches(number), registration:tournament_registrations(team:teams(name)), opener:profiles!disputes_opened_by_fkey(username)")
    .eq("tournament_id", tournamentId).order("created_at", { ascending: false });
  const list = (data ?? []) as unknown as { id: string; reason: string; evidence_urls: string[]; status: string; resolution: string | null; created_at: string; match: { number: number }; registration: { team: { name: string } }; opener: { username: string } }[];
  if (!list.length) return <EmptyState icon={Check} title="Nenhuma contestação" />;
  return (
    <ul className="grid gap-3">
      {list.map((d) => (
        <li key={d.id} className="rounded-3xl bg-card p-4">
          <p className="text-sm font-medium">Queda {d.match.number} · {d.registration.team.name} <span className="text-xs font-normal text-muted-foreground">por @{d.opener.username} · {formatRelative(d.created_at)}</span></p>
          <p className="mt-1 text-sm text-muted-foreground">{d.reason}</p>
          {d.evidence_urls.length > 0 && <ul className="mt-1 flex gap-2 text-xs">{d.evidence_urls.map((u, i) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-primary-text hover:underline">Evidência {i + 1}</a></li>)}</ul>}
          {d.status === "open" ? <div className="mt-3"><DisputeDecision id={d.id} /></div> : <p className="mt-2 text-xs">{d.status === "accepted" ? "Aceita" : "Recusada"}: {d.resolution}</p>}
        </li>
      ))}
    </ul>
  );
}

async function HistoryTab({ tournamentId }: { tournamentId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("audit_logs").select("id, action, data, created_at, actor:profiles(username)")
    .eq("tournament_id", tournamentId).order("created_at", { ascending: false }).limit(200);
  const list = (data ?? []) as unknown as { id: number; action: string; data: Record<string, unknown>; created_at: string; actor: { username: string } | null }[];
  if (!list.length) return <EmptyState icon={Check} title="Sem registros" />;
  return (
    <ul className="divide-y rounded-3xl bg-card text-sm">
      {list.map((l) => (
        <li key={l.id} className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
          <span className="text-xs font-medium">{auditLabel(l.action)}</span>
          <span className="truncate text-xs text-muted-foreground" title={JSON.stringify(l.data)}>{summarize(l.data)}</span>
          <span className="text-xs text-muted-foreground">@{l.actor?.username ?? "sistema"} · {formatDateTime(l.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

function summarize(d: Record<string, unknown>) {
  const pick = ["reason", "to", "from", "title", "match", "teams", "decision"].filter((k) => d?.[k] !== undefined && d?.[k] !== null);
  return pick.map((k) => `${k}: ${typeof d[k] === "object" ? JSON.stringify(d[k]) : String(d[k])}`).join(" · ") || "—";
}
