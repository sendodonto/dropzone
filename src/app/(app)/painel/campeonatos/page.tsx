import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, DemoBadge, EmptyState, PageHeader, RegistrationBadge, Section, StatusBadge } from "@/components/shared/ui-bits";
import { requireViewer } from "@/lib/auth";
import { getMyRegistrations, type MyRegistration } from "@/lib/player";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Meus campeonatos" };

export default async function MyTournamentsPage() {
  const viewer = await requireViewer();
  const regs = await getMyRegistrations(viewer.id);
  const current = regs.filter((r) => !["finished", "cancelled"].includes(r.tournament.status));
  const past = regs.filter((r) => ["finished", "cancelled"].includes(r.tournament.status));
  return (
    <div className="grid gap-10">
      <PageHeader title="Meus campeonatos" description="Inscrições ativas e histórico de participações."
        actions={<Link href="/campeonatos?status=open" className={buttonVariants()}>Buscar campeonatos</Link>} />
      <Section title="Em andamento e próximos">
        {current.length ? <RegList rows={current} /> : <EmptyState icon={Trophy} title="Nenhuma inscrição ativa" />}
      </Section>
      <Section title="Histórico">
        {past.length ? <RegList rows={past} /> : <p className="text-sm text-muted-foreground">Seu histórico aparece aqui após o primeiro campeonato.</p>}
      </Section>
    </div>
  );
}

function RegList({ rows }: { rows: MyRegistration[] }) {
  return (
    <ul className="divide-y rounded-3xl bg-card">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/campeonatos/${r.tournament.slug}`} className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/40">
            <Avatar src={r.team.logo_url} name={r.team.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.tournament.name} {r.tournament.is_demo && <DemoBadge />}</p>
              <p className="text-xs text-muted-foreground">{r.team.name} · {formatDateTime(r.tournament.starts_at)}</p>
            </div>
            {r.final_rank && <span className="font-heading text-lg font-bold text-primary-text">#{r.final_rank}</span>}
            <div className="flex basis-full gap-3 pl-12 sm:basis-auto sm:pl-0"><RegistrationBadge status={r.status} /><StatusBadge status={r.tournament.status} /></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
