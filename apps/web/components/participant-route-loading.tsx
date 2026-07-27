export function ParticipantRouteLoading() {
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 px-5 py-8 lg:px-9 lg:py-10" role="status" aria-live="polite" aria-label="Carregando conteúdo">
      <span className="sr-only">Carregando conteúdo…</span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-soft">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
      <div className="grid gap-3">
        <div className="h-4 w-28 animate-pulse rounded-full bg-surface-muted" />
        <div className="h-9 w-full max-w-xl animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-surface-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="min-h-44 animate-pulse rounded-card border border-border bg-white/80 p-5 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-surface-muted" />
            <div className="mt-6 h-5 w-2/3 rounded-full bg-surface-muted" />
            <div className="mt-4 h-4 w-full rounded-full bg-surface-muted" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
