"use client";

import { useMemo, useState } from "react";
import { AdminDisclosure } from "@/components/admin-section-nav";
import { CertificateTemplatePositioning } from "@/components/certificate-template-positioning";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { saveGamificationResourceAction } from "./actions";

type CertificateVersion = {
  id: string;
  version_number: number;
  status: string;
  journey_version_id: string;
  requirements_rule_version_id: string;
  template_file_object_id?: string | null;
  validity_policy?: Record<string, unknown>;
  template_layout?: Record<string, unknown>;
};
type CertificateDefinition = { definition_id: string; name: string; versions: CertificateVersion[] };
type NamedVersion = { id: string; definitionName: string; version_number: number };
type JourneyRuleVersion = NamedVersion & { expression?: Record<string, unknown> };

function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function numberValue(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function editableVersion(item: CertificateDefinition | null) {
  if (!item) return null;
  const sorted = [...item.versions].sort((a, b) => b.version_number - a.version_number);
  return sorted.find((version) => version.status === "draft") ?? sorted[0] ?? null;
}

export function CertificateEditor({ certificates, journeyVersions, ruleVersions }: { certificates: CertificateDefinition[]; journeyVersions: NamedVersion[]; ruleVersions: JourneyRuleVersion[] }) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(() => certificates.find((item) => item.definition_id === selectedDefinitionId) ?? null, [certificates, selectedDefinitionId]);
  const version = editableVersion(selected);
  const [journeyVersionId, setJourneyVersionId] = useState("");
  const selectedJourneyVersionId = journeyVersionId || version?.journey_version_id || "";
  const validity = objectValue(version?.validity_policy);
  const layout = objectValue(version?.template_layout);
  const compatibleRules = ruleVersions.filter((rule) => String(objectValue(rule.expression).journey_version_id ?? "") === selectedJourneyVersionId);
  const currentRuleIsCompatible = compatibleRules.some((rule) => rule.id === version?.requirements_rule_version_id);

  function selectCertificate(value: string) {
    setSelectedDefinitionId(value);
    const next = certificates.find((item) => item.definition_id === value) ?? null;
    setJourneyVersionId(editableVersion(next)?.journey_version_id ?? "");
  }

  return <Card>
    <div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Etapa 3 de 3</p><h2 className="mt-1 text-lg font-black text-secondary">Regra de emissão</h2><p className="mt-1 text-sm text-muted">Escolha a jornada que gera o certificado. A condição abaixo mostra somente regras publicadas vinculadas a essa mesma jornada; o banco também impede combinações incompatíveis.</p></div>
    <form key={`${selectedDefinitionId}:${version?.id ?? "new"}`} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
      <input type="hidden" name="resource_type" value="certificate" />
      <input type="hidden" name="template_file_object_id" value={version?.template_file_object_id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>Certificado existente<Select name="definition_id" value={selectedDefinitionId} onChange={(event) => selectCertificate(event.target.value)}><option value="">Criar novo</option>{certificates.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">Ao selecionar, a jornada e a regra atualmente usadas ficam visíveis para edição.</span></Label>
        <Label>Nome do certificado<Input name="name" required defaultValue={selected?.name ?? ""} placeholder="Ex.: Certificado de conclusão" /></Label>
        <Label className="sm:col-span-2">Jornada que emite o certificado<Select name="journey_version_id" required value={selectedJourneyVersionId} onChange={(event) => setJourneyVersionId(event.target.value)}><option value="">Selecione</option>{journeyVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName}</option>)}</Select><span className="text-[11px] font-normal text-muted">As opções vêm das jornadas cadastradas e ativas no LMS.</span></Label>
      </div>
      <AdminDisclosure title="Condição, validade e posição dos textos" description="Abra somente quando precisar ajustar a emissão ou o PDF.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Condição de conclusão desta jornada<Select name="requirements_rule_version_id" required defaultValue={currentRuleIsCompatible ? version?.requirements_rule_version_id ?? "" : ""} disabled={!selectedJourneyVersionId}><option value="">{selectedJourneyVersionId ? "Selecione" : "Escolha a jornada primeiro"}</option>{compatibleRules.map((item) => <option value={item.id} key={item.id}>{item.definitionName}</option>)}</Select><span className="text-[11px] font-normal text-muted">Só aparecem regras cujo gatilho é a conclusão da jornada escolhida. Regras de trilha, aula ou testes internos não aparecem aqui.</span></Label>
          <Label>Validade<Select name="validity_mode" defaultValue={validity.expires === true ? "months" : "never"}><option value="never">Não expira</option><option value="months">Expira depois de alguns meses</option></Select></Label>
          <Label>Meses de validade<Input name="validity_months" type="number" min="1" max="120" defaultValue={String(numberValue(validity.duration_months, 12))} /></Label>
          <Label>Disponibilidade<Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}><option value="draft">Preparar sem emitir</option><option value="published">Ativar emissão</option></Select></Label>
          {selectedJourneyVersionId && compatibleRules.length === 0 ? <p className="sm:col-span-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-ink">Esta jornada ainda não possui uma regra de conclusão publicada. Crie/publice a regra de conclusão antes de ativar a emissão do certificado.</p> : null}
          <div className="sm:col-span-2"><CertificateTemplatePositioning initialNameY={Math.round(numberValue(layout.name_y, 0.53) * 100)} initialJourneyY={Math.round(numberValue(layout.journey_y, 0.4) * 100)} initialTextColor={String(layout.text_color ?? "primary")} /></div>
        </div>
      </AdminDisclosure>
      <PendingSubmitButton pendingLabel="Salvando certificado…" className="w-fit">Salvar certificado</PendingSubmitButton>
    </form>
  </Card>;
}
