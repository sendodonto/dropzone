import { TournamentCardSkeleton } from "@/components/tournament/tournament-card";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10" aria-busy="true" aria-label="Carregando campeonatos">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <TournamentCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
