import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, ExternalLink, History, LogOut, Trash2, UserMinus, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, PageHeader, RegistrationBadge, Section } from "@/components/shared/ui-bits";
import { ActionButton } from "@/components/shared/action-button";
import { ActionForm, Field, SubmitButton } from "@/components/shared/action-form";
import { TeamForm } from "@/components/app/team-form";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelInvite, deleteTeam, inviteMember, leaveTeam, removeMember, transferCaptain, updateTeam } from "@/lib/actions/teams";
import { formatDate, formatRelative } from "@/lib/format";
import type { RegistrationStatus, Team } from "@/lib/types";

export const metadata: Metadata = { title: "Gerenciar squad" };

const eventLabel: Record<string, string> = {
  created: "criou o squad", joined: "entrou no squad", left: "saiu do squad", removed: "foi removido", captain_transferred: "virou capitão",
};

export default async function SquadPage({ params }: PageProps<"/painel/squads/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("*").eq("id", id).maybeSingle<Team>();
  if (!team) notFound();
  const [{ data: members }, { data: invites }, { data: events }, { data: regs }] = await Promise.all([
    supabase.from("team_members").select("role, joined_at, user:profiles(id, username, display_name, avatar_url, ff_id)").eq("team_id", id).order("joined_at"),
    supabase.from("team_invites").select("id, created_at, user:profiles!team_invites_invited_user_id_fkey(username, display_name)").eq("team_id", id).eq("status", "pending"),
    supabase.from("team_member_events").select("id, action, created_at, user:profiles!team_member_events_user_id_fkey(username)").eq("team_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("tournament_registrations").select("id, status, final_rank, tournament:tournaments(name, slug, starts_at)").eq("team_id", id).order("created_at", { ascending: false }),
  ]);
  type M = { role: string; joined_at: string; user: { id: string; username: string; display_name: string; avatar_url: string | null; ff_id: string | null } };
  const list = (members ?? []) as unknown as M[];
  if (!list.some((m) => m.user.id === viewer.id)) notFound();
  const isCaptain = team.captain_id === viewer.id;

  return (
    <div className="grid gap-10">
      <PageHeader meta={`[${team.tag}]`} title={team.name} description={team.description ?? undefined}
        actions={<Link href={`/equipes/${team.slug}`} className={buttonVariants({ variant: "outline" })}><ExternalLink /> Página pública</Link>} />

      <div className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <div className="grid content-start gap-10">
          <Section title={`Integrantes (${list.length}/6)`}>
            <ul className="divide-y rounded-3xl bg-card">
              {list.map((m) => (
                <li key={m.user.id} className="flex flex-wrap items-center gap-3 p-3">
                  <Avatar src={m.user.avatar_url} name={m.user.display_name} rounded />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {m.user.display_name}{m.role === "captain" && <Crown className="size-3.5 text-primary-text" aria-label="Capitão" />}
                    </p>
                    <p className="text-xs text-muted-foreground">@{m.user.username}{m.user.ff_id && ` · ID ${m.user.ff_id}`} · desde {formatDate(m.joined_at)}</p>
                  </div>
                  {isCaptain && m.user.id !== viewer.id && (
                    <div className="flex gap-1">
                      <ActionButton action={transferCaptain.bind(null, team.id, m.user.id)} variant="ghost" size="sm"
                        confirm={{ title: `Transferir liderança para ${m.user.display_name}?`, description: "Você deixa de ser capitão e não poderá mais gerenciar o squad." }}>
                        <Crown /> <span className="sr-only sm:not-sr-only">Capitão</span>
                      </ActionButton>
                      <ActionButton action={removeMember.bind(null, team.id, m.user.id)} variant="ghost" size="sm" ariaLabel={`Remover ${m.user.display_name}`}
                        confirm={{ title: `Remover ${m.user.display_name}?`, destructive: true, confirmLabel: "Remover" }}>
                        <UserMinus />
                      </ActionButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {isCaptain && (
            <Section title="Convidar jogador">
              <div className="grid gap-4 rounded-3xl bg-card p-4">
                <ActionForm action={inviteMember.bind(null, team.id)} resetOnSuccess className="sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field name="username" label="Username do jogador" placeholder="ex.: kaio_sniper" required />
                  <SubmitButton>Enviar convite</SubmitButton>
                </ActionForm>
                {(invites ?? []).length > 0 && (
                  <ul className="grid gap-2 border-t pt-3">
                    {(invites as unknown as { id: string; created_at: string; user: { username: string } }[]).map((i) => (
                      <li key={i.id} className="flex items-center justify-between text-sm">
                        <span>@{i.user.username} <span className="text-xs text-muted-foreground">· pendente {formatRelative(i.created_at)}</span></span>
                        <ActionButton action={cancelInvite.bind(null, i.id)} variant="ghost" size="sm"><X /> Cancelar</ActionButton>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}

          <Section title="Competições">
            {(regs ?? []).length ? (
              <ul className="divide-y rounded-3xl bg-card">
                {(regs as unknown as { id: string; status: RegistrationStatus; final_rank: number | null; tournament: { name: string; slug: string; starts_at: string } }[]).map((r) => (
                  <li key={r.id}>
                    <Link href={`/campeonatos/${r.tournament.slug}`} className="flex flex-wrap items-center gap-3 p-3 text-sm hover:bg-muted/40">
                      <span className="min-w-0 flex-1 truncate">{r.tournament.name}</span>
                      {r.final_rank && <span className="font-heading font-bold text-primary-text">#{r.final_rank}</span>}
                      <RegistrationBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">O squad ainda não disputou campeonatos.</p>}
          </Section>
        </div>

        <div className="grid content-start gap-10">
          {isCaptain && (
            <Section title="Editar squad">
              <div className="rounded-3xl bg-card p-5"><TeamForm action={updateTeam.bind(null, team.id)} team={team} submitLabel="Salvar alterações" /></div>
            </Section>
          )}
          <Section title="Histórico da escalação">
            <ul className="grid gap-2 text-sm">
              {(events as unknown as { id: string; action: string; created_at: string; user: { username: string } | null }[] ?? []).map((e) => (
                <li key={e.id} className="flex gap-2"><History className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span><strong className="font-medium">@{e.user?.username ?? "jogador"}</strong> {eventLabel[e.action] ?? e.action}
                    <span className="text-xs text-muted-foreground"> · {formatRelative(e.created_at)}</span></span>
                </li>
              ))}
            </ul>
          </Section>
          <div className="flex flex-wrap gap-2 border-t pt-6">
            {isCaptain ? (
              <ActionButton action={deleteTeam.bind(null, team.id)} variant="destructive"
                confirm={{ title: "Excluir squad?", description: "Só é possível excluir squads sem histórico de campeonatos. Esta ação não pode ser desfeita.", destructive: true, confirmLabel: "Excluir" }}>
                <Trash2 /> Excluir squad
              </ActionButton>
            ) : (
              <ActionButton action={leaveTeam.bind(null, team.id)} variant="outline" confirm={{ title: "Sair do squad?", confirmLabel: "Sair" }}>
                <LogOut /> Sair do squad
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
