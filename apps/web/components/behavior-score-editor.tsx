"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type {
  BehaviorScoreClassificationConfiguration,
  BehaviorScoreConfiguration,
  BehaviorScoreDimensionConfiguration,
} from "@/lib/extensions/runtime";

const metrics = [
  ["event_count", "Todos os eventos"],
  ["active_days", "Dias ativos"],
  ["depth_events", "Interações de profundidade"],
  ["completion_events", "Conclusões"],
  ["autonomy_events", "Ações autônomas"],
  ["quality_average", "Qualidade média das entregas"],
  ["active_weeks", "Semanas ativas"],
] as const;

function number(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function newDimension(index: number): BehaviorScoreDimensionConfiguration {
  return {
    code: `dimensao_${index + 1}`,
    name: `Dimensão ${index + 1}`,
    metric: "event_count",
    weight: 1,
    multiplier: 1,
    offset: 0,
    cap: 100,
  };
}

function newClassification(index: number): BehaviorScoreClassificationConfiguration {
  return {
    code: `faixa_${index + 1}`,
    label: `Faixa ${index + 1}`,
    minimum: 0,
    maximum: 100,
  };
}

export function BehaviorScoreEditor({ initialConfiguration }: { initialConfiguration: BehaviorScoreConfiguration }) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const serialized = useMemo(() => JSON.stringify(configuration), [configuration]);

  function updateDimension(index: number, patch: Partial<BehaviorScoreDimensionConfiguration>) {
    setConfiguration((current) => ({
      ...current,
      dimensions: current.dimensions.map((dimension, currentIndex) => currentIndex === index ? { ...dimension, ...patch } : dimension),
    }));
  }

  function updateClassification(index: number, patch: Partial<BehaviorScoreClassificationConfiguration>) {
    setConfiguration((current) => ({
      ...current,
      classifications: current.classifications.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item),
    }));
  }

  return <form action={saveExtensionAction} className="grid gap-6">
    <input type="hidden" name="resource_type" value="behavior_score_configuration" />
    <input type="hidden" name="return_to" value="/admin/comportamento" />
    <input type="hidden" name="json_fields" value="configuration" />
    <input type="hidden" name="configuration" value={serialized} />

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div>
        <h2 className="text-lg font-black text-secondary">Fórmula e normalização</h2>
        <p className="mt-1 text-sm text-muted">A configuração é validada no servidor. Não é possível executar código arbitrário.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-ink">Fórmula
          <Select value={configuration.formula} onChange={(event) => setConfiguration((current) => ({ ...current, formula: event.target.value as BehaviorScoreConfiguration["formula"] }))}>
            <option value="weighted_average">Média ponderada</option>
            <option value="weighted_sum">Soma ponderada</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">Mínimo bruto
          <Input type="number" step="0.01" value={configuration.normalization.minimum} onChange={(event) => setConfiguration((current) => ({ ...current, normalization: { ...current.normalization, minimum: number(event.target.value) } }))} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">Máximo bruto
          <Input type="number" step="0.01" value={configuration.normalization.maximum} onChange={(event) => setConfiguration((current) => ({ ...current, normalization: { ...current.normalization, maximum: number(event.target.value, 100) } }))} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">Eventos para confiança total
          <Input type="number" min={1} step={1} value={configuration.confidence.events_for_full_confidence} onChange={(event) => setConfiguration((current) => ({ ...current, confidence: { events_for_full_confidence: Math.max(1, number(event.target.value, 30)) } }))} />
        </label>
      </div>
    </section>

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-black text-secondary">Dimensões e pesos</h2><p className="mt-1 text-sm text-muted">Cada dimensão transforma um conjunto de interações em um valor entre zero e o teto definido.</p></div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => setConfiguration((current) => ({ ...current, dimensions: [...current.dimensions, newDimension(current.dimensions.length)] }))}>Adicionar dimensão</Button>
      </div>
      <div className="grid gap-3">
        {configuration.dimensions.map((dimension, index) => <article key={`${dimension.code}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1.5fr_auto] md:items-end">
            <label className="grid gap-1 text-xs font-semibold text-muted">Código
              <Input value={dimension.code} pattern="[a-z][a-z0-9_]{1,49}" onChange={(event) => updateDimension(index, { code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Nome
              <Input value={dimension.name} onChange={(event) => updateDimension(index, { name: event.target.value })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Dado utilizado
              <Select value={dimension.metric} onChange={(event) => updateDimension(index, { metric: event.target.value as BehaviorScoreDimensionConfiguration["metric"] })}>
                {metrics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${dimension.name}`} disabled={configuration.dimensions.length === 1} onClick={() => setConfiguration((current) => ({ ...current, dimensions: current.dimensions.filter((_, currentIndex) => currentIndex !== index) }))}><Trash2 size={16} /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="grid gap-1 text-xs font-semibold text-muted">Peso
              <Input type="number" min={0} step="0.01" value={dimension.weight} onChange={(event) => updateDimension(index, { weight: Math.max(0, number(event.target.value)) })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Multiplicador
              <Input type="number" min={0.01} step="0.01" value={dimension.multiplier} onChange={(event) => updateDimension(index, { multiplier: Math.max(0.01, number(event.target.value, 1)) })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Ajuste
              <Input type="number" step="0.01" value={dimension.offset} onChange={(event) => updateDimension(index, { offset: number(event.target.value) })} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">Teto
              <Input type="number" min={0} max={100} step="0.01" value={dimension.cap} onChange={(event) => updateDimension(index, { cap: Math.min(100, Math.max(0, number(event.target.value, 100))) })} />
            </label>
          </div>
          <p className="text-xs text-muted"><strong className="text-secondary">Cálculo:</strong> limite(0, {dimension.cap}, dado × {dimension.multiplier} + {dimension.offset}); peso {dimension.weight}.</p>
        </article>)}
      </div>
    </section>

    <section className="grid gap-4 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-black text-secondary">Faixas de classificação</h2><p className="mt-1 text-sm text-muted">As faixas usam o score final normalizado entre 0 e 100.</p></div>
        <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => setConfiguration((current) => ({ ...current, classifications: [...current.classifications, newClassification(current.classifications.length)] }))}>Adicionar faixa</Button>
      </div>
      <div className="grid gap-3">
        {configuration.classifications.map((classification, index) => <div key={`${classification.code}-${index}`} className="grid gap-3 rounded-xl bg-surface-muted p-4 sm:grid-cols-[1fr_1.2fr_.7fr_.7fr_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-semibold text-muted">Código<Input value={classification.code} onChange={(event) => updateClassification(index, { code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Nome<Input value={classification.label} onChange={(event) => updateClassification(index, { label: event.target.value })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Mínimo<Input type="number" min={0} max={100} step="0.01" value={classification.minimum} onChange={(event) => updateClassification(index, { minimum: number(event.target.value) })} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Máximo<Input type="number" min={0} max={100} step="0.01" value={classification.maximum} onChange={(event) => updateClassification(index, { maximum: number(event.target.value, 100) })} /></label>
          <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${classification.label}`} disabled={configuration.classifications.length === 1} onClick={() => setConfiguration((current) => ({ ...current, classifications: current.classifications.filter((_, currentIndex) => currentIndex !== index) }))}><Trash2 size={16} /></Button>
        </div>)}
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-soft p-4">
      <p className="max-w-2xl text-sm text-muted">Salvar recalcula imediatamente todos os participantes. Depois disso, cada nova interação atualiza o score continuamente.</p>
      <Button type="submit">Salvar cálculo e recalcular</Button>
    </div>
  </form>;
}
