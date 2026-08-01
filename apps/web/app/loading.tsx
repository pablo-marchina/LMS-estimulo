export default function Loading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-soft/80"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Carregando a Plataforma Estímulo…</span>
      <div className="h-full w-2/3 animate-pulse rounded-r-full bg-primary shadow-[0_0_16px_rgba(0,0,141,.35)]" />
    </div>
  );
}
