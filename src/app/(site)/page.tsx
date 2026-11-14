import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, Search, ShieldCheck, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TournamentCard, SlotBar } from "@/components/tournament/tournament-card";
import { Avatar, EmptyState, StatusBadge } from "@/components/shared/ui-bits";
import { createClient } from "@/lib/supabase/server";
import { listTournaments, regCount } from "@/lib/queries";
import { formatDate, formatDateTime, formatPoints, modeLabel, plural } from "@/lib/format";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const quick = [
  { label: "Inscrições abertas", href: "/campeonatos?status=open" },
  { label: "Ao vivo", href: "/campeonatos?status=live" },
  { label: "Gratuitos", href: "/campeonatos?price=free" },
  { label: "Com vagas", href: "/campeonatos?slots=available" },
];

type TeamRow = { team_id: string; rank: number; name: string; tag: string; slug: string; logo_url: string | null; points: number; wins: number };
type PlayerRow = { user_id: string; rank: number; username: string; display_name: string; avatar_url: string | null; kills: number; tournaments: number };
type OrgRow = { organizer_id: string; name: string; slug: string; logo_url: string | null; is_official: boolean; tournaments: number; teams_hosted: number };

export default async function HomePage() {
  const supabase = await createClient();
  const [all, teamsRank, playersRank, orgRank] = await Promise.all([
    listTournaments({ limit: 60 }),
    supabase.rpc("get_team_rankings", { p_limit: 5 }),
    supabase.rpc("get_player_rankings", { p_limit: 5 }),
    supabase.rpc("get_organizer_rankings", { p_limit: 4 }),
  ]);

  const active = all.filter((t) => ["registration_open", "registration_closed", "live"].includes(t.status));
  const byPriority = [...active].sort((a, b) =>
    Number(b.status === "live") - Number(a.status === "live") || Number(b.featured) - Number(a.featured) || +new Date(a.starts_at) - +new Date(b.starts_at));
  const now = byPriority.slice(0, 4);
  const open = active.filter((t) => t.status === "registration_open").slice(0, 6);
  const upcoming = active.filter((t) => t.status !== "live").slice(0, 5);
  const finished = all.filter((t) => t.status === "finished").sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)).slice(0, 4);
  const champions = finished.length
    ? (await supabase.from("tournament_registrations").select("tournament_id, team:teams(name, tag, slug, logo_url)")
        .in("tournament_id", finished.map((t) => t.id)).eq("final_rank", 1)).data ?? []
    : [];
  const teams = (teamsRank.data ?? []) as TeamRow[];
  const players = (playersRank.data ?? []) as PlayerRow[];
  const orgs = (orgRank.data ?? []) as OrgRow[];

  return (
    <>
      {/* ── Blue field: the offer, a working search, and what is on right now ── */}
      <section className="on-color bg-primary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
          <div className="settle">
            <h1 className="max-w-[13ch] text-[2.6rem] leading-[0.98] text-balance sm:text-6xl lg:text-[4.6rem]">
              Seu próximo campeonato começa aqui.
            </h1>
            <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{site.description}</p>

            <form action="/campeonatos" method="get" role="search" className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
              <label htmlFor="hero-q" className="sr-only">Buscar campeonato pelo nome</label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[oklch(0.45_0_0)]" aria-hidden />
                <input id="hero-q" name="q" placeholder="Buscar campeonato" maxLength={60}
                  className="h-13 w-full rounded-full bg-white pr-4 pl-12 text-base text-[oklch(0.16_0_0)] placeholder:text-[oklch(0.5_0_0)] outline-none focus-visible:ring-3 focus-visible:ring-white/60" />
              </div>
              <Button type="submit" size="lg" className="h-13 bg-[oklch(0.16_0_0)] px-6 text-white hover:bg-[oklch(0.26_0_0)]">
                Buscar <ArrowRight />
              </Button>
            </form>
            <nav aria-label="Atalhos" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="font-medium underline decoration-white/40 underline-offset-4 hover:decoration-white">{q.label}</Link>
              ))}
            </nav>
          </div>

          {/* Live proof: the actual tournaments on the platform right now */}
          <div className="settle rounded-3xl bg-card text-card-foreground" style={{ "--delay": "140ms", background: "white" } as CSSProperties}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base">Agora no {site.name}</h2>
              <Link href="/campeonatos" className="text-sm font-medium text-primary-text hover:underline">Ver todos</Link>
            </div>
            {now.length ? (
              <ul className="divide-y">
                {now.map((t) => (
                  <li key={t.id}>
                    <Link href={`/campeonatos/${t.slug}`} className="press block px-5 py-4 hover:bg-muted/60">
                      <div className="flex items-center gap-2 text-xs">
                        <StatusBadge status={t.status} />
                        <span className="text-muted-foreground">· {formatDateTime(t.starts_at)}</span>
                      </div>
                      <p className="mt-1.5 truncate font-heading text-[1.05rem]">{t.name}</p>
                      <SlotBar className="mt-2.5" taken={regCount(t)} max={t.max_teams} solo={t.mode === "solo"} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum campeonato ativo agora.</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-20 px-4 py-16 sm:px-6 lg:py-24">
        {/* ── Open registrations ── */}
        <section aria-labelledby="abertos" className="grid gap-6">
          <SectionHead id="abertos" title="Inscrições abertas" href="/campeonatos?status=open" link="Ver todos" />
          {open.length ? (
            <div className={cn("grid gap-4 sm:grid-cols-2", open.length === 4 ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
              {open.map((t) => <TournamentCard key={t.id} t={t} />)}
            </div>
          ) : (
            <EmptyState icon={Trophy} title="Nenhuma inscrição aberta agora" description="Volte em breve ou crie o seu campeonato."
              action={<Link href="/organizador/comecar" className={buttonVariants()}>Organizar campeonato</Link>} />
          )}
        </section>

        {/* ── Agenda and rankings ── */}
        <section aria-label="Agenda e rankings" className="grid gap-x-10 gap-y-14 lg:grid-cols-3">
          <RankedList title="Agenda" href="/campeonatos?status=upcoming" link="Ver agenda"
            empty="Nenhum torneio agendado."
            rows={upcoming.map((t) => ({
              key: t.id, href: `/campeonatos/${t.slug}`, lead: formatDate(t.starts_at), date: true,
              title: t.name, sub: `${t.organizer?.name} · ${modeLabel[t.mode]}`,
              tail: <span className="text-xs tabular-nums text-muted-foreground">{regCount(t)}/{t.max_teams}</span>,
            }))} />
          <RankedList title="Ranking de squads" href="/rankings" link="Completo"
            empty="O ranking aparece após o primeiro campeonato finalizado."
            rows={teams.map((t) => ({
              key: t.team_id, href: `/equipes/${t.slug}`, lead: String(t.rank), first: t.rank === 1,
              title: t.name, sub: `${t.wins} Booyah${t.wins === 1 ? "" : "s"}`,
              tail: <span className="font-heading text-base tabular-nums">{formatPoints(t.points)}</span>,
            }))} />
          <RankedList title="Melhores jogadores" href="/rankings?tipo=jogadores" link="Completo"
            empty="O ranking aparece após o primeiro campeonato finalizado."
            rows={players.map((p) => ({
              key: p.user_id, href: `/jogadores/${p.username}`, lead: String(p.rank), first: p.rank === 1,
              title: p.display_name ?? p.username, sub: `@${p.username}`,
              tail: <span className="text-sm tabular-nums">{p.kills} <span className="text-muted-foreground">abates</span></span>,
            }))} />
        </section>

        {/* ── Organizers ── */}
        {orgs.length > 0 && (
          <section aria-labelledby="org" className="grid gap-6">
            <SectionHead id="org" title="Organizadores em destaque" />
            <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {orgs.map((o) => (
                <li key={o.organizer_id}>
                  <Link href={`/organizadores/${o.slug}`} className="group flex items-center gap-3">
                    <Avatar src={o.logo_url} name={o.name} size="lg" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate font-semibold group-hover:text-primary-text">{o.name}{o.is_official && <ShieldCheck className="size-4 shrink-0 text-primary-text" aria-label="Oficial" />}</span>
                      <span className="block text-sm text-muted-foreground">{plural(o.tournaments, "campeonato", "campeonatos")} · {plural(o.teams_hosted, "squad", "squads")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── How it works ── */}
        <section aria-labelledby="como" className="grid gap-10 border-t pt-14 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 id="como" className="text-3xl sm:text-4xl">Como funciona</h2>
            <p className="mt-3 max-w-[34ch] text-muted-foreground">Do convite do squad até a tabela final, sem planilha e sem grupo de mensagem.</p>
          </div>
          <div className="grid gap-12 sm:grid-cols-2">
            <Steps who="Para jogadores" steps={[
              ["Monte o squad", "Crie a equipe, convide pelo username e defina o capitão."],
              ["Inscreva-se", "Escolha titulares e reserva. Ninguém joga por dois squads no mesmo campeonato."],
              ["Receba a sala", "ID e senha liberados só para equipes confirmadas, na hora certa."],
              ["Suba no ranking", "Só resultados verificados contam para ranking e temporada."],
            ]} />
            <Steps who="Para organizadores" steps={[
              ["Crie o campeonato", "Regras, pontuação e premiação em seis etapas."],
              ["Controle as vagas", "Aprove, remova com justificativa e publique avisos."],
              ["Lance as quedas", "Colocação e abates; a pontuação se calcula sozinha."],
              ["Feche a tabela", "Desempate configurável, contestação com prazo e histórico."],
            ]} />
          </div>
        </section>
      </div>

      {/* ── Champions: the second blue field ── */}
      {finished.length > 0 && (
        <section aria-labelledby="campeoes" className="on-color bg-primary">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="flex items-end justify-between gap-4">
              <h2 id="campeoes" className="text-2xl sm:text-3xl">Últimos campeões</h2>
              <Link href="/campeonatos?status=finished" className="shrink-0 text-sm font-medium whitespace-nowrap underline decoration-white/40 underline-offset-4 hover:decoration-white">Encerrados</Link>
            </div>
            <ol className="mt-8 divide-y divide-white/20 border-y border-white/20">
              {finished.map((t) => {
                const champ = champions.find((c) => c.tournament_id === t.id)?.team as unknown as { name: string } | undefined;
                return (
                  <li key={t.id}>
                    <Link href={`/campeonatos/${t.slug}?tab=classificacao`} className="press grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
                      <span className="font-heading text-[1.9rem] leading-tight sm:text-5xl">{champ?.name ?? "A definir"}</span>
                      <span className="text-sm text-muted-foreground">{t.name} · {formatDate(t.starts_at)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ── Closing: black field ── */}
      <section className="on-color bg-[oklch(0.16_0_0)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:py-20">
          <h2 className="max-w-[16ch] text-4xl text-balance sm:text-5xl">Coloque seu squad no próximo campeonato.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/cadastro" className={buttonVariants({ size: "lg", className: "h-12 px-6" })}>Criar conta grátis</Link>
            <Link href="/organizador/comecar" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "h-12 px-6 text-white hover:bg-white/10 hover:text-white")}>
              Organizar campeonato <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ id, title, href, link }: { id: string; title: string; href?: string; link?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="text-2xl sm:text-3xl">{title}</h2>
      {href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap text-primary-text hover:underline">{link} <ArrowRight className="size-4" aria-hidden /></Link>}
    </div>
  );
}

type Row = { key: string; href: string; lead: string; date?: boolean; first?: boolean; title: string; sub: string; tail: React.ReactNode };

function RankedList({ title, href, link, rows, empty }: { title: string; href: string; link: string; rows: Row[]; empty: string }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 border-b border-foreground pb-3">
        <h2 className="text-xl">{title}</h2>
        <Link href={href} className="text-sm font-medium text-primary-text hover:underline">{link}</Link>
      </div>
      {rows.length ? (
        <ol className="divide-y">
          {rows.map((r) => (
            <li key={r.key}>
              <Link href={r.href} className="press -mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/70">
                {r.date ? (
                  <span className="grid w-12 shrink-0 text-center leading-none">
                    <span className="font-heading text-lg tabular-nums">{r.lead.split(" ")[0]}</span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">{r.lead.split(" ")[2]}</span>
                  </span>
                ) : (
                  <span className={cn("w-12 shrink-0 font-heading text-sm tabular-nums", r.first ? "text-primary-text" : "text-muted-foreground")}>{r.lead}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                </span>
                {r.tail}
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="py-6 text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

function Steps({ who, steps }: { who: string; steps: [string, string][] }) {
  return (
    <div>
      <h3 className="text-lg">{who}</h3>
      <ol className="mt-5 grid gap-5">
        {steps.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
            <span className="font-heading text-sm text-primary-text tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="block font-semibold">{t}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
