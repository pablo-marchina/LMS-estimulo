export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 lg:px-9 lg:py-10" role="status" aria-live="polite">
      <span className="sr-only">Carregando a Plataforma Estímulo…</span>
      <div className="mx-auto grid w-full max-w-[1400px] gap-8">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-soft">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
        <div className="grid gap-3">
          <div className="h-4 w-32 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-4 w-full max-w-3xl animate-pulse rounded-full bg-surface-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-card border border-border bg-white/75 shadow-sm" />
          ))}
        </div>
      </div>
    </main>
  );
}
