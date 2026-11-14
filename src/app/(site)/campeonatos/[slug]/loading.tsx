export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando campeonato">
      <div className="h-72 animate-pulse border-b bg-muted/50" />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
