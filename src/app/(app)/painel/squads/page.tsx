import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Users } from "lucide-react";
import { Avatar, DemoBadge, EmptyState, PageHeader, Section } from "@/components/shared/ui-bits";
import { InviteList } from "@/components/app/invite-card";
import { TeamForm } from "@/components/app/team-form";
import { requireViewer } from "@/lib/auth";
import { getMyInvites, getMyTeams } from "@/lib/player";
import { createTeam } from "@/lib/actions/teams";

export const metadata: Metadata = { title: "Meus squads" };

export default async function SquadsPage() {
  const viewer = await requireViewer();
  const [teams, invites] = await Promise.all([getMyTeams(viewer.id), getMyInvites(viewer.id)]);
  return (
    <div className="grid gap-10">
      <PageHeader title="Squads" description="Crie equipes, convide jogadores e gerencie a escalação." />
      {invites.length > 0 && <Section title="Convites recebidos"><InviteList invites={invites} /></Section>}
      <div className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <Section title="Meus squads">
          {teams.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {teams.map(({ team, role }) => (
                <li key={team.id}>
                  <Link href={`/painel/squads/${team.id}`} className="flex items-center gap-3 rounded-3xl bg-card p-4 transition-colors hover:border-primary/40">
                    <Avatar src={team.logo_url} name={team.name} size="lg" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-heading text-lg font-semibold">{team.name} {team.is_demo && <DemoBadge />}</p>
                      <p className="text-xs text-muted-foreground">[{team.tag}] · {team.members?.[0]?.count ?? 0} integrantes</p>
                      {role === "captain" && <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary-text"><Crown className="size-3" aria-hidden /> Capitão</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={Users} title="Nenhum squad ainda" description="Crie o primeiro ao lado ou aceite um convite." />}
        </Section>
        <Section title="Criar squad">
          <div className="rounded-3xl bg-card p-5">
            <TeamForm action={createTeam} submitLabel="Criar squad" />
          </div>
        </Section>
      </div>
    </div>
  );
}
