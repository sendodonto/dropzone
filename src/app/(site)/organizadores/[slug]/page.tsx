import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, ShieldCheck, Trophy } from "lucide-react";
import { Avatar, DemoBadge, EmptyState, PageHeader, Section } from "@/components/shared/ui-bits";
import { TournamentCard } from "@/components/tournament/tournament-card";
import { createClient } from "@/lib/supabase/server";
import { listTournaments } from "@/lib/queries";
import type { Organizer } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/organizadores/[slug]">): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from("organizers").select("name").eq("slug", (await params).slug).maybeSingle();
  return { title: data?.name ?? "Organizador" };
}

export default async function OrganizerPage({ params }: PageProps<"/organizadores/[slug]">) {
  const supabase = await createClient();
  const { data: o } = await supabase.from("organizers").select("*").eq("slug", (await params).slug).maybeSingle<Organizer>();
  if (!o || o.status === "suspended") notFound();
  const all = await listTournaments({ organizer: o.id, limit: 60 });
  const upcoming = all.filter((t) => t.status !== "finished");
  const past = all.filter((t) => t.status === "finished");
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={o.logo_url} name={o.name} size="xl" />
        <PageHeader meta={<span className="inline-flex items-center gap-2">{o.is_official ? <><ShieldCheck className="size-3.5" /> Organizador oficial</> : "Organizador"} {o.is_demo && <DemoBadge />}</span>}
          title={o.name} description={o.description ?? undefined}
          actions={o.contact_url && <a href={o.contact_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-text hover:underline">Contato <ExternalLink className="size-3.5" /></a>} />
      </div>
      <Section title="Campeonatos ativos">
        {upcoming.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((t) => <TournamentCard key={t.id} t={t} />)}</div>
          : <EmptyState icon={Trophy} title="Nenhum campeonato ativo" />}
      </Section>
      {past.length > 0 && (
        <Section title="Encerrados">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.map((t) => <TournamentCard key={t.id} t={t} />)}</div>
        </Section>
      )}
    </div>
  );
}
