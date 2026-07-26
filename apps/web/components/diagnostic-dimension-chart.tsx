import type { DiagnosticDimensionSummary } from "@/lib/engagement/contracts";

export function DiagnosticDimensionChart({ dimensions }: { dimensions: DiagnosticDimensionSummary[] }) {
  return (
    <section className="mt-6" aria-labelledby="diagnostic-dimensions-title">
      <div className="mb-4">
        <h3 id="diagnostic-dimensions-title" className="text-base font-black text-secondary">Resultado nas cinco áreas</h3>
        <p className="mt-1 text-sm text-muted">A porcentagem compara sua pontuação com o máximo possível em cada área.</p>
      </div>
      <div className="grid gap-4">
        {dimensions.map((dimension) => {
          const percentage = Math.min(100, Math.max(0, Math.round(dimension.percentage)));
          return (
            <div key={dimension.code} className="grid gap-2" aria-label={`${dimension.name}: ${percentage}%`}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-secondary">{dimension.name}</span>
                <span className="font-black tabular-nums text-primary">{percentage}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-primary-soft" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
