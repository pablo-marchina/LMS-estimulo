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

function objectValue(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function numberValue(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }

export function CertificateEditor({ certificates, journeyVersions, ruleVersions }: { certificates: CertificateDefinition[]; journeyVersions: NamedVersion[]; ruleVersions: NamedVersion[] }) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(() => certificates.find((item) => item.definition_id === selectedDefinitionId) ?? null, [certificates, selectedDefinitionId]);
  const version = selected ? [...selected.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "draft") ?? [...selected.versions].sort((a, b) => b.version_number - a.version_number)[0] ?? null : null;
  const validity = objectValue(version?.validity_policy);
  const layout = objectValue(version?.template_layout);

  return <Card>
    <div><h2 className="text-lg font-black text-secondary">Regra de emissão</h2><p className="mt-1 text-sm text-muted">Escolha qual jornada gera o certificado e qual condição precisa ser cumprida. O fundo é escolhido automaticamente pelos modelos definidos acima.</p></div>
    <form key={`${selectedDefinitionId}:${version?.id ?? "new"}`} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
      <input type="hidden" name="resource_type" value="certificate" />
      <input type="hidden" name="template_file_object_id" value={version?.template_file_object_id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>Certificado existente<Select name="definition_id" value={selectedDefinitionId} onChange={(event) => setSelectedDefinitionId(event.target.value)}><option value="">Criar novo</option>{certificates.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}</Select></Label>
        <Label>Nome do certificado<Input name="name" required defaultValue={selected?.name ?? ""} placeholder="Ex.: Certificado de conclusão" /></Label>
        <Label className="sm:col-span-2">Jornada<Select name="journey_version_id" required defaultValue={version?.journey_version_id ?? ""}><option value="">Selecione</option>{journeyVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName}</option>)}</Select></Label>
      </div>
      <AdminDisclosure title="Condição, validade e posição dos textos" description="Abra somente quando precisar ajustar a emissão ou o PDF.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>Condição para receber<Select name="requirements_rule_version_id" required defaultValue={version?.requirements_rule_version_id ?? ""}><option value="">Selecione</option>{ruleVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName}</option>)}</Select></Label>
          <Label>Validade<Select name="validity_mode" defaultValue={validity.expires === true ? "months" : "never"}><option value="never">Não expira</option><option value="months">Expira depois de alguns meses</option></Select></Label>
          <Label>Meses de validade<Input name="validity_months" type="number" min="1" max="120" defaultValue={String(numberValue(validity.duration_months, 12))} /></Label>
          <Label>Disponibilidade<Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}><option value="draft">Preparar sem emitir</option><option value="published">Ativar emissão</option></Select></Label>
          <div className="sm:col-span-2"><CertificateTemplatePositioning initialNameY={Math.round(numberValue(layout.name_y, 0.53) * 100)} initialJourneyY={Math.round(numberValue(layout.journey_y, 0.4) * 100)} initialTextColor={String(layout.text_color ?? "primary")} /></div>
        </div>
      </AdminDisclosure>
      <PendingSubmitButton pendingLabel="Salvando certificado…" className="w-fit">Salvar certificado</PendingSubmitButton>
    </form>
  </Card>;
}
