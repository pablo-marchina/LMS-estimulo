"use client";

import { useMemo, useState } from "react";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { retirePointRuleAction, saveGamificationResourceAction } from "./actions";

type RuleVersion = {
  id: string;
  version_number: number;
  status: string;
  amount: number;
  eligibility_rule_version_id: string;
  recurrence_policy?: Record<string, unknown>;
};

type PointRule = { definition_id: string; name: string; versions: RuleVersion[] };
export type AssessmentTargetOption = {
  activityCode: string;
  activityTitle: string;
  pathCode: string;
  pathName: string;
  journeyName: string;
};

const triggerOptions = [
  ["journey.instance.started", "Iniciar uma jornada"],
  ["diagnostic.session.completed", "Concluir o diagnóstico"],
  ["learning.activity.utility.rated", "Avaliar uma aula"],
  ["learning.activity.completed", "Concluir uma aula"],
  ["assessment.attempt.submitted", "Enviar uma atividade rápida ou avaliação"],
  ["assessment.attempt.passed", "Ser aprovado em uma avaliação específica"],
  ["learning.practice.evidence.confirmed", "Enviar uma atividade prática"],
  ["learning.external_credential.confirmed", "Enviar um certificado"],
  ["journey.path.completed", "Concluir uma trilha"],
  ["engagement.social.shared", "Compartilhar diagnóstico ou certificado"],
] as const;

function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function frequencyFromPolicy(recurrence: Record<string, unknown>) {
  if (recurrence.frequency === "per_certificate") return "per_certificate";
  const map: Record<string, string> = { participant: "once", enrollment_activity: "per_activity", enrollment_assessment: "per_assessment", path: "per_path", journey: "per_journey", participant_day: "daily", participant_week: "weekly", event: "unlimited" };
  return map[String(recurrence.scope ?? "")] ?? "once";
}

export function PointRuleEditor({ pointRules, assessmentTargets }: { pointRules: PointRule[]; assessmentTargets: AssessmentTargetOption[] }) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(() => pointRules.find((item) => item.definition_id === selectedDefinitionId) ?? null, [pointRules, selectedDefinitionId]);
  const version = selected ? [...selected.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "published") ?? [...selected.versions].sort((a, b) => b.version_number - a.version_number)[0] ?? null : null;
  const recurrence = objectValue(version?.recurrence_policy);
  const trigger = objectValue(recurrence.trigger);
  const [frequency, setFrequency] = useState(frequencyFromPolicy(recurrence));
  const [triggerEvent, setTriggerEvent] = useState(String(trigger.event_name ?? ""));
  const [selectedActivities, setSelectedActivities] = useState<string[]>(stringArray(trigger.activity_codes));

  function selectRule(value: string) {
    setSelectedDefinitionId(value);
    const next = pointRules.find((item) => item.definition_id === value);
    const nextVersion = next ? [...next.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "published") ?? [...next.versions].sort((a, b) => b.version_number - a.version_number)[0] : null;
    const nextRecurrence = objectValue(nextVersion?.recurrence_policy);
    const nextTrigger = objectValue(nextRecurrence.trigger);
    setFrequency(frequencyFromPolicy(nextRecurrence));
    setTriggerEvent(String(nextTrigger.event_name ?? ""));
    setSelectedActivities(stringArray(nextTrigger.activity_codes));
  }

  function toggleActivity(code: string) {
    setSelectedActivities((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  const requiresAssessmentTarget = triggerEvent === "assessment.attempt.passed";

  return <Card>
    <div><h2 className="text-lg font-black text-secondary">Criar ou atualizar regra</h2><p className="mt-1 text-sm text-muted">Configure quais ações geram pontos, edite o texto mostrado ao participante e desative regras que não devem mais pontuar.</p></div>
    <form key={selectedDefinitionId || "new"} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
      <input type="hidden" name="resource_type" value="point_rule" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>Regra existente<Select name="definition_id" value={selectedDefinitionId} onChange={(event) => selectRule(event.target.value)}><option value="">Criar nova</option>{pointRules.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Selecionar uma regra não altera a versão publicada até você salvar.</span></Label>
        <Label>Nome mostrado no admin<Input name="name" required defaultValue={selected?.name ?? ""} placeholder="Ex.: Aprovar o desafio final da formação-base" /><span className="text-[11px] font-normal text-muted">Use um nome que diga claramente qual ação gera os pontos.</span></Label>
        <Label className="sm:col-span-2">Descrição mostrada ao participante<Textarea name="description" maxLength={320} defaultValue={String(recurrence.description ?? "")} placeholder="Ex.: Você ganha pontos ao concluir esta aula." /><span className="text-[11px] font-normal text-muted">Pode ser alterada sem mudar o histórico de pontos já concedidos.</span></Label>
        <Label>Ação que gera pontos<Select name="trigger_event" required value={triggerEvent} onChange={(event) => { setTriggerEvent(event.target.value); if (event.target.value !== "assessment.attempt.passed") setSelectedActivities([]); }}><option value="">Selecione</option>{triggerOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</Select></Label>
        <Label>Pontos por ação<Input name="amount" type="number" min="1" required defaultValue={String(version?.amount ?? 10)} /></Label>
      </div>

      {requiresAssessmentTarget ? <fieldset className="grid gap-3 rounded-2xl border border-primary/20 bg-primary-soft/30 p-4">
        <legend className="px-1 text-sm font-black text-secondary">Qual avaliação dispara esta regra?</legend>
        <p className="text-xs leading-5 text-muted">Selecione uma ou mais avaliações reais da plataforma. O servidor salva os códigos da aula e da trilha juntos para impedir que uma regra genérica pontue avaliações erradas.</p>
        <div className="grid gap-2 lg:grid-cols-2">
          {assessmentTargets.map((target) => {
            const checked = selectedActivities.includes(target.activityCode);
            return <label key={`${target.pathCode}:${target.activityCode}`} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-primary/35 bg-white" : "border-border bg-white/70 hover:border-primary/25"}`}>
              <input type="checkbox" name="trigger_activity_code" value={target.activityCode} checked={checked} onChange={() => toggleActivity(target.activityCode)} className="mt-0.5 size-4 accent-primary" />
              <input type="hidden" name={checked ? "trigger_path_code" : undefined} value={target.pathCode} />
              <span><strong className="block text-secondary">{target.activityTitle}</strong><span className="mt-0.5 block text-xs text-muted">{target.journeyName} · {target.pathName}</span></span>
            </label>;
          })}
        </div>
        {assessmentTargets.length === 0 ? <p className="text-sm text-warning">Nenhuma avaliação publicada foi encontrada. Publique a avaliação antes de criar uma regra de aprovação.</p> : null}
      </fieldset> : null}

      <AdminDisclosure open title="Limites e publicação" description="Controle quantas vezes a mesma ação pode gerar pontos e quando a regra entra em vigor.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Frequência<Select name="frequency" value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="once">Uma única vez por participante</option><option value="per_activity">Uma vez por aula</option><option value="per_assessment">Uma vez por avaliação</option><option value="per_certificate">Uma vez por certificado</option><option value="per_path">Uma vez por trilha</option><option value="per_journey">Uma vez por jornada</option><option value="daily">Limite por dia</option><option value="weekly">Limite por semana</option><option value="unlimited">Sempre que acontecer</option></Select></Label>
          <Label>Máximo no período<Input name="maximum_awards" type="number" min="1" defaultValue={String(recurrence.maximum ?? recurrence.maximum_awards ?? 1)} disabled={frequency === "unlimited" || frequency === "per_certificate"} /><span className="text-[11px] font-normal text-muted">{frequency === "per_certificate" ? "Cada certificado confirmado possui sua própria referência idempotente." : frequency === "unlimited" ? "Sem limite para esta frequência." : "Quantidade máxima de concessões dentro da frequência escolhida."}</span></Label>
          <Label>Estado<Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}><option value="draft">Salvar rascunho</option><option value="published">Publicar agora</option></Select></Label>
          <div className="rounded-xl border border-success/25 bg-success-soft p-3 text-xs leading-5 text-ink"><strong className="block text-secondary">Elegibilidade geral</strong>A regra técnica de elegibilidade é vinculada automaticamente. Para aprovações, a avaliação selecionada acima também passa a fazer parte do gatilho persistido.</div>
        </div>
      </AdminDisclosure>
      <PendingSubmitButton pendingLabel="Salvando regra…" className="w-fit">Salvar regra</PendingSubmitButton>
    </form>

    {selected ? <form
      action={retirePointRuleAction}
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-danger/15 pt-5"
      onSubmit={(event) => { if (!window.confirm(`Remover a pontuação de “${selected.name}”? O histórico já concedido será preservado.`)) event.preventDefault(); }}
    >
      <input type="hidden" name="definition_id" value={selected.definition_id} />
      <input type="hidden" name="idempotency_key" value={`retire:${selected.definition_id}`} />
      <p className="max-w-xl text-xs leading-5 text-muted">A ação deixa de gerar novos pontos. Pontos já concedidos e o histórico de auditoria são preservados.</p>
      <PendingSubmitButton pendingLabel="Removendo pontuação…" className="w-fit bg-danger text-white hover:bg-danger/90">Remover pontuação desta ação</PendingSubmitButton>
    </form> : null}
  </Card>;
}
