import type { DiagnosticDimensionSummary } from "@/lib/engagement/contracts";

function point(index: number, count: number, radius: number, centerX = 210, centerY = 170) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
}

function polygon(count: number, radius: number) {
  return Array.from({ length: count }, (_, index) => {
    const value = point(index, count, radius);
    return `${value.x.toFixed(1)},${value.y.toFixed(1)}`;
  }).join(" ");
}

export function DiagnosticDimensionChart({ dimensions }: { dimensions: DiagnosticDimensionSummary[] }) {
  if (dimensions.length < 3) return null;
  const normalized = dimensions.map((dimension) => ({ ...dimension, percentage: Math.min(100, Math.max(0, Math.round(dimension.percentage))) }));
  const dataPoints = normalized.map((dimension, index) => {
    const value = point(index, normalized.length, 120 * (dimension.percentage / 100));
    return `${value.x.toFixed(1)},${value.y.toFixed(1)}`;
  }).join(" ");

  return (
    <section className="mt-6" aria-labelledby="diagnostic-dimensions-title">
      <div className="mb-4"><h3 id="diagnostic-dimensions-title" className="text-base font-black text-secondary">Radar do seu momento empreendedor</h3><p className="mt-1 text-sm text-muted">Quanto mais o desenho se aproxima da borda, maior foi sua pontuação naquela área.</p></div>
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-primary-soft/35 p-3 sm:p-5">
        <svg viewBox="0 0 420 360" role="img" aria-labelledby="radar-title radar-description" className="mx-auto w-full max-w-[38rem]">
          <title id="radar-title">Gráfico radar do diagnóstico empreendedor</title>
          <desc id="radar-description">{normalized.map((dimension) => `${dimension.name}: ${dimension.percentage}%`).join("; ")}</desc>
          {[.2, .4, .6, .8, 1].map((level) => <polygon key={level} points={polygon(normalized.length, 120 * level)} fill="none" stroke="currentColor" className="text-primary/15" strokeWidth={level === 1 ? 2 : 1} />)}
          {normalized.map((_, index) => { const axis = point(index, normalized.length, 120); return <line key={index} x1="210" y1="170" x2={axis.x} y2={axis.y} stroke="currentColor" className="text-primary/20" />; })}
          <polygon points={dataPoints} fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" className="text-primary" />
          {normalized.map((dimension, index) => { const data = point(index, normalized.length, 120 * (dimension.percentage / 100)); const label = point(index, normalized.length, 151); const anchor = label.x < 190 ? "end" : label.x > 230 ? "start" : "middle"; return <g key={dimension.code}><circle cx={data.x} cy={data.y} r="5" fill="currentColor" className="text-primary" /><text x={label.x} y={label.y - 4} textAnchor={anchor} className="fill-secondary text-[11px] font-bold">{dimension.name}</text><text x={label.x} y={label.y + 12} textAnchor={anchor} className="fill-primary text-[11px] font-black">{dimension.percentage}%</text></g>; })}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">{normalized.map((dimension) => <span key={dimension.code} className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-semibold text-secondary">{dimension.name}: <strong className="text-primary">{dimension.percentage}%</strong></span>)}</div>
    </section>
  );
}
