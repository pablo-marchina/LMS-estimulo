import type { DiagnosticDimensionSummary } from "@/lib/engagement/contracts";

function qualitativeLabel(percentage: number) {
  if (percentage >= 75) return "Ponto forte";
  if (percentage >= 50) return "Em desenvolvimento";
  return "Oportunidade de evolução";
}

export function DiagnosticDimensionChart({ dimensions }: { dimensions: DiagnosticDimensionSummary[] }) {
  if (!dimensions.length) return null;

  const normalized = dimensions.map((dimension) => ({
    ...dimension,
    percentage: Math.min(100, Math.max(0, Math.round(dimension.percentage))),
  }));

  return (
    <section className="mt-6" aria-labelledby="diagnostic-dimensions-title">
      <div className="mb-4">
        <h3 id="diagnostic-dimensions-title" className="text-base font-black text-secondary">
          Seu momento por área
        </h3>
        <p className="mt-1 text-sm text-muted">
          As barras mostram, de forma qualitativa, onde você está mais preparado e onde pode evoluir.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-primary/15 bg-primary-soft/35 p-4 sm:p-5">
        {normalized.map((dimension) => (
          <div key={dimension.code} className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <strong className="text-secondary">{dimension.name}</strong>
              <span className="text-xs font-semibold text-primary">{qualitativeLabel(dimension.percentage)}</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-white shadow-inner"
              role="progressbar"
              aria-label={dimension.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={dimension.percentage}
              aria-valuetext={qualitativeLabel(dimension.percentage)}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(4, dimension.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
