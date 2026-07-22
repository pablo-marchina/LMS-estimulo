import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center gap-6 bg-surface-muted p-6">
      <Card className="w-full max-w-md" role="status" aria-live="polite">
        <span className="sr-only">Carregando dados da jornada…</span>
        <div className="grid gap-4">
          <div className="h-5 w-1/2 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-surface-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-surface-muted" />
        </div>
      </Card>
    </main>
  );
}
