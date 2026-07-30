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

type CertificateDefinition = {
  definition_id: string;
  name: string;
  versions: CertificateVersion[];
};

type NamedVersion = { id: string; definitionName: string; version_number: number };
type TemplateOption = { file_object_id: string; original_filename: string | null; created_at: string };

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function CertificateEditor({
  certificates,
  journeyVersions,
  ruleVersions,
  templates,
  uploadedTemplateId,
}: {
  certificates: CertificateDefinition[];
  journeyVersions: NamedVersion[];
  ruleVersions: NamedVersion[];
  templates: TemplateOption[];
  uploadedTemplateId?: string;
}) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("");
  const selected = useMemo(() => certificates.find((item) => item.definition_id === selectedDefinitionId) ?? null, [certificates, selectedDefinitionId]);
  const version = selected
    ? [...selected.versions].sort((a, b) => b.version_number - a.version_number).find((item) => item.status === "draft")
      ?? [...selected.versions].sort((a, b) => b.version_number - a.version_number)[0]
      ?? null
    : null;
  const validity = objectValue(version?.validity_policy);
  const layout = objectValue(version?.template_layout);
  const templateId = uploadedTemplateId || version?.template_file_object_id || "";
  const layoutKey = `${selectedDefinitionId}:${version?.id ?? "new"}`;

  return (
    <Card>
      <div>
        <h2 className="text-lg font-black text-secondary">Configurar certificado</h2>
        <p className="mt-1 text-sm text-muted">Abra um certificado salvo para carregar sua jornada, regra, validade, template e posicionamento atuais.</p>
      </div>

      <form key={`${layoutKey}:${uploadedTemplateId ?? ""}`} action={saveGamificationResourceAction} className="mt-5 grid gap-4">
        <input type="hidden" name="resource_type" value="certificate" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Certificado existente
            <Select name="definition_id" value={selectedDefinitionId} onChange={(event) => setSelectedDefinitionId(event.target.value)}>
              <option value="">Criar novo</option>
              {certificates.map((item) => <option value={item.definition_id} key={item.definition_id}>{item.name}</option>)}
            </Select>
          </Label>
          <Label>
            Nome do certificado
            <Input name="name" required defaultValue={selected?.name ?? ""} />
          </Label>
          <Label>
            Jornada
            <Select name="journey_version_id" required defaultValue={version?.journey_version_id ?? ""}>
              <option value="">Selecione</option>
              {journeyVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName} · versão {item.version_number}</option>)}
            </Select>
          </Label>
          <Label>
            Template salvo
            <Select name="template_file_object_id" defaultValue={templateId}>
              <option value="">Sem imagem de fundo</option>
              {templates.map((item) => <option value={item.file_object_id} key={item.file_object_id}>{item.original_filename ?? "Template sem nome"}</option>)}
            </Select>
            <span className="text-[11px] font-normal text-muted">Todo template preparado permanece nesta lista após recarregar ou sair da página.</span>
          </Label>
        </div>

        <AdminDisclosure title="Regra, posicionamento e validade" description="Configurações avançadas do PDF e da emissão.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              Condição para receber
              <Select name="requirements_rule_version_id" required defaultValue={version?.requirements_rule_version_id ?? ""}>
                <option value="">Selecione</option>
                {ruleVersions.map((item) => <option value={item.id} key={item.id}>{item.definitionName} · versão {item.version_number}</option>)}
              </Select>
            </Label>
            <Label>
              Validade
              <Select name="validity_mode" defaultValue={validity.expires === true ? "months" : "never"}>
                <option value="never">Não expira</option>
                <option value="months">Expira em meses</option>
              </Select>
            </Label>
            <Label>
              Meses de validade
              <Input name="validity_months" type="number" min="1" max="120" defaultValue={String(numberValue(validity.duration_months, 12))} />
            </Label>
            <Label>
              Estado
              <Select name="status" defaultValue={version?.status === "published" ? "published" : "draft"}>
                <option value="draft">Salvar rascunho</option>
                <option value="published">Publicar agora</option>
              </Select>
            </Label>
            <div className="sm:col-span-2">
              <CertificateTemplatePositioning
                initialNameY={Math.round(numberValue(layout.name_y, 0.53) * 100)}
                initialJourneyY={Math.round(numberValue(layout.journey_y, 0.4) * 100)}
                initialTextColor={String(layout.text_color ?? "primary")}
              />
            </div>
          </div>
        </AdminDisclosure>

        <PendingSubmitButton pendingLabel="Salvando certificado…" className="w-fit">Salvar certificado</PendingSubmitButton>
      </form>
    </Card>
  );
}
