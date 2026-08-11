import type { DiagnosticDimensionSummary } from "@/lib/engagement/contracts";

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
          Um olhar mais de perto
        </h3>
        <p className="mt-1 text-sm text-muted">
          Veja como suas respostas se distribuem nos temas que fazem parte do seu perfil.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-primary/15 bg-primary-soft/35 p-4 sm:p-5">
        {normalized.map((dimension) => (
          <div key={dimension.code} className="grid gap-2">
            <strong className="text-sm text-secondary">{dimension.name}</strong>
            <div className="flex items-center gap-3">
              <div
                className="h-3 flex-1 overflow-hidden rounded-full bg-white shadow-inner"
                role="progressbar"
                aria-label={dimension.name}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={dimension.percentage}
                aria-valuetext={`${dimension.percentage}%`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${dimension.percentage}%` }}
                />
              </div>
              <strong className="w-12 text-right text-sm tabular-nums text-primary">
                {dimension.percentage}%
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
