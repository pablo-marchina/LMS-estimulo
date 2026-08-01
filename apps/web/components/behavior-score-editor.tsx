"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { BehaviorScoreClassificationConfiguration, BehaviorScoreConfiguration, BehaviorScoreDimensionConfiguration } from "@/lib/extensions/runtime";

const metrics = [
  ["event_count", "Todos os eventos"],
  ["active_days", "Dias ativos"],
  ["depth_events", "Interações de profundidade"],
  ["completion_events", "Conclusões"],
  ["autonomy_events", "Ações autônomas"],
  ["quality_average", "Qualidade média das entregas"],
  ["active_weeks", "Semanas ativas"],
] as const;

const codePattern = /^[a-z][a-z0-9_]{1,49}$/u;
const RANGE_TOLERANCE = 0.011;

function number(value: string, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function newDimension(index: number): BehaviorScoreDimensionConfiguration { return { code: `dimensao_${index + 1}`, name: `Dimensão ${index + 1}`, metric: "event_count", weight: 1, multiplier: 1, offset: 0, cap: 100 }; }
function newClassification(index: number): BehaviorScoreClassificationConfiguration { return { code: `faixa_${index + 1}`, label: `Faixa ${index + 1}`, minimum: 0, maximum: 100 }; }

function validateConfiguration(configuration: BehaviorScoreConfiguration) {
  const errors: string[] = [];
  if (!Number.isFinite(configuration.normalization.minimum) || !Number.isFinite(configuration.normalization.maximum) || configuration.normalization.minimum >= configuration.normalization.maximum) errors.push("O mínimo bruto deve ser menor que o máximo bruto.");
  if (!Number.isFinite(configuration.confidence.events_for_full_confidence) || configuration.confidence.events_for_full_confidence <= 0) errors.push("A confiança total exige pelo menos um evento.");
  const dimensionCodes = new Set<string>();
  let totalWeight = 0;
  configuration.dimensions.forEach((dimension, index) => {
    const position = index + 1;
    if (!codePattern.test(dimension.code)) errors.push(`A dimensão ${position} precisa de um código válido e único.`);
    if (dimensionCodes.has(dimension.code)) errors.push(`O código de dimensão “${dimension.code}” está repetido.`);
    dimensionCodes.add(dimension.code);
    if (!dimension.name.trim()) errors.push(`A dimensão ${position} precisa de um nome.`);
    if (!Number.isFinite(dimension.weight) || dimension.weight < 0) errors.push(`O peso da dimensão “${dimension.name || position}” não pode ser negativo.`);
    if (!Number.isFinite(dimension.multiplier) || dimension.multiplier <= 0) errors.push(`O multiplicador da dimensão “${dimension.name || position}” deve ser maior que zero.`);
    if (!Number.isFinite(dimension.cap) || dimension.cap < 0 || dimension.cap > 100) errors.push(`O teto da dimensão “${dimension.name || position}” deve ficar entre 0 e 100.`);
    totalWeight += Number.isFinite(dimension.weight) ? dimension.weight : 0;
  });
  if (totalWeight <= 0) errors.push("A soma dos pesos das dimensões deve ser maior que zero.");

  const classifications = [...configuration.classifications].sort((a, b) => a.minimum - b.minimum || a.maximum - b.maximum);
  const classificationCodes = new Set<string>();
  classifications.forEach((classification, index) => {
    const position = index + 1;
    if (!codePattern.test(classification.code)) errors.push(`A faixa ${position} precisa de um código válido e único.`);
    if (classificationCodes.has(classification.code)) errors.push(`O código de faixa “${classification.code}” está repetido.`);
    classificationCodes.add(classification.code);
    if (!classification.label.trim()) errors.push(`A faixa ${position} precisa de um nome.`);
    if (!Number.isFinite(classification.minimum) || !Number.isFinite(classification.maximum) || classification.minimum < 0 || classification.maximum > 100 || classification.minimum > classification.maximum) errors.push(`A faixa “${classification.label || position}” deve ter limites válidos entre 0 e 100.`);
  });
  if (classifications.length) {
    if (Math.abs(classifications[0].minimum) > RANGE_TOLERANCE) errors.push("As faixas devem começar em 0.");
    if (Math.abs(classifications.at(-1)!.maximum - 100) > RANGE_TOLERANCE) errors.push("As faixas devem terminar em 100.");
    for (let index = 1; index < classifications.length; index += 1) {
      const previous = classifications[index - 1];
      const current = classifications[index];
      if (current.minimum <= previous.maximum) errors.push(`As faixas “${previous.label}” e “${current.label}” se sobrepõem.`);
      else if (current.minimum - previous.maximum > RANGE_TOLERANCE) errors.push(`Existe uma lacuna entre as faixas “${previous.label}” e “${current.label}”.`);
    }
  }
  return errors;
}

export function BehaviorScoreEditor({ initialConfiguration }: { initialConfiguration: BehaviorScoreConfiguration }) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const errors = useMemo(() => validateConfiguration(configuration), [configuration]);
  const normalizedConfiguration = useMemo(() => ({ ...configuration, classifications: [...configuration.classifications].sort((a, b) => a.minimum - b.minimum || a.maximum - b.maximum) }), [configuration]);
  const serialized = useMemo(() => JSON.stringify(normalizedConfiguration), [normalizedConfiguration]);

  function updateDimension(index: number, patch: Partial<BehaviorScoreDimensionConfiguration>) {
    setConfiguration((current) => ({ ...current, dimensions: current.dimensions.map((dimension, currentIndex) => currentIndex === index ? { ...dimension, ...patch } : dimension) }));
  }
  function updateClassification(index: number, patch: Partial<BehaviorScoreClassificationConfiguration>) {
    setConfiguration((current) => ({ ...current, classifications: current.classifications.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item) }));
  }

  return <form action={saveExtensionAction} className="grid gap-6" onSubmit={(event) => { if (errors.length) { event.preventDefault(); document.getElementById("behavior-score-errors")?.focus(); } }}>
    <input type="hidden" name="resource_type" value="behavior_score_configuration" />
    <input type="hidden" name="return_to" value="/admin/comportamento" />
    <input type="hidden" name="json_fields" value="configuration" />
    <input type="hidden" name="configuration" value={serialized} />

    {errors.length ? <section id="behavior-score-errors" tabIndex={-1} className="rounded-2xl border border-warning/30 bg-warning-soft p-4" role="alert" aria-live="polite"><div className="flex items-start gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-warning" /><div><h2 className="font-black text-secondary">Revise a configuração antes de salvar</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div></div></section> : null}

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div><h2 className="text-lg font-black text-secondary">Fórmula e normalização</h2><p className="mt-1 text-sm text-muted">A configuração é validada no navegador e novamente no banco. Não é possível executar código arbitrário.</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-ink">Fórmula<Select value={configuration.formula} onChange={(event) => setConfiguration((current) => ({ ...current, formula: event.target.value as BehaviorScoreConfiguration["formula"] }))}><option value="weighted_average">Média ponderada</option><option value="weighted_sum">Soma ponderada</option></Select></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Mínimo bruto<Input type="number" step="0.01" value={configuration.normalization.minimum} onChange={(event) => setConfiguration((current) => ({ ...current, normalization: { ...current.normalization, minimum: number(event.target.value) } }))} /></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Máximo bruto<Input type="number" step="0.01" value={configuration.normalization.maximum} onChange={(event) => setConfiguration((current) => ({ ...current, normalization: { ...current.normalization, maximum: number(event.target.value, 100) } }))} /></label>
        <label className="grid gap-1 text-sm font-medium text-ink">Eventos para confiança total<Input type="number" min={1} step={1} value={configuration.confidence.events_for_full_confidence} onChange={(event) => setConfiguration((current) => ({ ...current, confidence: { events_for_full_confidence: Math.max(1, number(event.target.value, 30)) } }))} /></label>
      </div>
    </section>

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-secondary">Dimensões e pesos</h2><p className="mt-1 text-sm text-muted">Cada dimensão transforma um conjunto de interações em um valor entre zero e o teto definido.</p></div><Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => setConfiguration((current) => ({ ...current, dimensions: [...current.dimensions, newDimension(current.dimensions.length)] }))}>Adicionar dimensão</Button></div>
      <div className="grid gap-3">{configuration.dimensions.map((dimension, index) => <article key={`${dimension.code}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1.5fr_auto] md:items-end">
          <label className="grid gap-1 text-xs font-semibold text-muted">Código<Input value={dimension.code} pattern="[a-z][a-z0-9_]{1,49}" onChange={(event) => updateDimension(index, { code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Nome<Input value={dimension.name} onChange={(event) => updateDimension(index, { name: event.target.value })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Dado utilizado<Select value={dimension.metric} onChange={(event) => updateDimension(index, { metric: event.target.value as BehaviorScoreDimensionConfiguration["metric"] })}>{metrics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${dimension.name}`} disabled={configuration.dimensions.length === 1} onClick={() => setConfiguration((current) => ({ ...current, dimensions: current.dimensions.filter((_, currentIndex) => currentIndex !== index) }))}><Trash2 size={16} /></Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-muted">Peso<Input type="number" min={0} step="0.01" value={dimension.weight} onChange={(event) => updateDimension(index, { weight: Math.max(0, number(event.target.value)) })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Multiplicador<Input type="number" min={0.01} step="0.01" value={dimension.multiplier} onChange={(event) => updateDimension(index, { multiplier: Math.max(0.01, number(event.target.value, 1)) })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Ajuste<Input type="number" step="0.01" value={dimension.offset} onChange={(event) => updateDimension(index, { offset: number(event.target.value) })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Teto<Input type="number" min={0} max={100} step="0.01" value={dimension.cap} onChange={(event) => updateDimension(index, { cap: Math.min(100, Math.max(0, number(event.target.value, 100))) })} /></label>
        </div>
        <p className="text-xs text-muted"><strong className="text-secondary">Cálculo:</strong> limite(0, {dimension.cap}, dado × {dimension.multiplier} + {dimension.offset}); peso {dimension.weight}.</p>
      </article>)}</div>
    </section>

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-secondary">Faixas de classificação</h2><p className="mt-1 text-sm text-muted">As faixas devem cobrir continuamente o score final de 0 a 100, sem lacunas ou sobreposição.</p></div><Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => setConfiguration((current) => ({ ...current, classifications: [...current.classifications, newClassification(current.classifications.length)] }))}>Adicionar faixa</Button></div>
      <div className="grid gap-3">{configuration.classifications.map((classification, index) => <div key={`${classification.code}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-[1fr_1.2fr_.7fr_.7fr_auto] sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-muted">Código<Input value={classification.code} pattern="[a-z][a-z0-9_]{1,49}" onChange={(event) => updateClassification(index, { code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Nome<Input value={classification.label} onChange={(event) => updateClassification(index, { label: event.target.value })} /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Mínimo<Input type="number" min={0} max={100} step="0.01" value={classification.minimum} onChange={(event) => updateClassification(index, { minimum: number(event.target.value) })} /></label>
        <label className="grid gap-1 text-xs font-semibold text-muted">Máximo<Input type="number" min={0} max={100} step="0.01" value={classification.maximum} onChange={(event) => updateClassification(index, { maximum: number(event.target.value, 100) })} /></label>
        <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${classification.label}`} disabled={configuration.classifications.length === 1} onClick={() => setConfiguration((current) => ({ ...current, classifications: current.classifications.filter((_, currentIndex) => currentIndex !== index) }))}><Trash2 size={16} /></Button>
      </div>)}</div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-soft p-4"><p className="max-w-2xl text-sm text-muted">Salvar recalcula imediatamente todos os participantes. Depois disso, cada nova interação atualiza o score continuamente.</p><Button type="submit" disabled={errors.length > 0}>Salvar cálculo e recalcular</Button></div>
  </form>;
}
