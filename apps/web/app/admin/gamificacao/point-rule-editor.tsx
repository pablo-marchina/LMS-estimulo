"use client";

import { useMemo, useState } from "react";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { saveGamificationResourceAction } from "./actions";

type RuleVersion = {
  id: string;
  version_number: number;
  status: string;
  amount: number;
  eligibility_rule_version_id: string;
  recurrence_policy?: Record<string, unknown>;
};

type PointRule = { definition_id: string; name: string; versions: RuleVersion[] };

const triggerOptions = [
  ["journey.instance.started", "Iniciar uma jornada"],
  ["diagnostic.session.completed", "Concluir o diagnóstico"],
  ["learning.activity.utility.rated", "Avaliar uma aula"],
  ["learning.activity.completed", "Concluir uma aula"],
  ["assessment.attempt.submitted", "Enviar uma atividade rápida ou avaliação"],
  ["assessment.attempt.passed", "Ser aprovado em uma avaliação"],
  ["learning.practice.evidence.confirmed", "Enviar uma atividade prática"],
  ["learning.external_credential.confirmed", "Enviar um certificado"],
  ["journey.path.completed", "Concluir uma trilha"],
  ["engagement.social.shared", "Compartilhar diagnóstico ou certificado"],
] as const;

function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function frequencyFromPolicy(recurrence: Record<string, unknown>) {
  if (recurrence.frequency === "per_certificate") return "per_certificate";
  const map: Record<string, string> = { participant: "once", enrollment_activity: "per_activity", enrollment_assessment: "per_assessment", path: "per_path", journey: "per_journey", participant_day: "daily", participant_week: "weekly", event: "unlimited" };
  return map[String(recurrence.scope ?? "")] ?? "once";
}

export function PointRuleEditor({ pointRules }: { pointRules: PointRule[] }) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(() => pointRules.find((item) => item.definition_id === selectedDefinitionId) ?? null, [pointRules, selectedDefinitionId]);
  const version = selected ? [...selected.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "published") ?? [...selected.versions].sort((a, b) => b.version_number - a.version_number)[0] ?? null : null;
  const recurrence = objectValue(version?.recurrence_policy);
  const trigger = objectValue(recurrence.trigger);
  const [frequency, setFrequency] = useState(frequencyFromPolicy(recurrence));

  function selectRule(value: string) {
    setSelectedDefinitionId(value);
    const next = pointRules.find((item) => item.definition_id === value);
    const nextVersion = next ? [...next.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "published") ?? [...next.versions].sort((a, b) => b.version_number - a.version_number)[0] : null;
    setFrequency(frequencyFromPolicy(objectValue(nextVersion?.recurrence_policy)));
  }

  return <Card>
    <div><h2 className="text-lg font-black text-secondary">Criar ou atualizar regra</h2><p className="mt-1 text-sm text-muted">Configure somente o comportamento que muda para o participante. A elegibilidade técnica geral é aplicada automaticamente pelo servidor.</p></div>
    <form key={selectedDefinitionId || "new"} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
      <input type="hidden" name="resource_type" value="point_rule" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>Regra existente<Select name="definition_id" value={selectedDefinitionId} onChange={(event) => selectRule(event.target.value)}><option value="">Criar nova</option>{pointRules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Selecionar uma regra não altera a versão publicada até você salvar.</span></Label>
        <Label>Nome da ação<Input name="name" required defaultValue={selected?.name ?? ""} placeholder="Ex.: Concluir o diagnóstico" /></Label>
        <Label>Ação que gera pontos<Select name="trigger_event" required defaultValue={String(trigger.event_name ?? "")}><option value="">Selecione</option>{triggerOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></Label>
        <Label>Pontos por ação<Input name="amount" type="number" min="1" required defaultValue={String(version?.amount ?? 10)} /></Label>
      </div>
      <AdminDisclosure title="Limites e publicação" description="Controle quantas vezes a mesma ação pode gerar pontos e quando a regra entra em vigor.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Frequência<Select name="frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="once">Uma única vez por participante</option><option value="per_activity">Uma vez por aula</option><option value="per_assessment">Uma vez por avaliação</option><option value="per_certificate">Uma vez por certificado</option><option value="per_path">Uma vez por trilha</option><option value="per_journey">Uma vez por jornada</option><option value="daily">Limite por dia</option><option value="weekly">Limite por semana</option><option value="unlimited">Sempre que acontecer</option></Select></Label>
          <Label>Máximo no período<Input name="maximum_awards" type="number" min="1" defaultValue={String(recurrence.maximum ?? recurrence.maximum_awards ?? 1)} disabled={frequency === "unlimited" || frequency === "per_certificate"} /><span className="text-[11px] font-normal text-muted">{frequency === "per_certificate" ? "Cada certificado confirmado possui sua própria referência idempotente." : frequency === "unlimited" ? "Sem limite para esta frequência." : "Quantidade máxima de concessões dentro da frequência escolhida."}</span></Label>
          <Label>Estado<Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}><option value="draft">Salvar rascunho</option><option value="published">Publicar agora</option></Select></Label>
          <div className="rounded-xl border border-success/25 bg-success-soft p-3 text-xs leading-5 text-ink"><strong className="block text-secondary">Elegibilidade geral</strong>A regra técnica de elegibilidade é vinculada automaticamente. Você não precisa escolher regras internas, jornadas ou IDs para que esta ação funcione.</div>
        </div>
      </AdminDisclosure>
      <PendingSubmitButton pendingLabel="Salvando regra…" className="w-fit">Salvar regra</PendingSubmitButton>
    </form>
  </Card>;
}
