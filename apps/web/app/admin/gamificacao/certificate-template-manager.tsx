import { ExternalLink, FileImage, FileText, ImageUp } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function assetName(asset: JsonRecord | undefined) { return text(asset?.name) || text(asset?.original_filename) || "Fundo do certificado"; }
function previewUrl(organizationId: string, asset: JsonRecord | undefined) {
  const fileObjectId = text(asset?.file_object_id);
  if (!fileObjectId) return "";
  return `/api/certificate-template-previews/${encodeURIComponent(fileObjectId)}?organization_id=${encodeURIComponent(organizationId)}`;
}
const returnTo = "/admin/gamificacao?tipo=certificados#templates-certificado";

function PersistedTemplatePreview({ organizationId, asset, className = "" }: { organizationId: string; asset: JsonRecord | undefined; className?: string }) {
  const src = previewUrl(organizationId, asset);
  if (!src) return <span className={`grid place-items-center rounded-lg bg-primary-soft text-primary ${className}`} aria-hidden="true"><FileImage size={20} /></span>;
  if (text(asset?.media_type) === "pdf") {
    return <a href={src} target="_blank" rel="noreferrer" className={`grid place-items-center rounded-lg border border-border bg-primary-soft text-primary transition hover:border-primary/35 hover:bg-primary-soft/70 ${className}`} aria-label={`Abrir ${assetName(asset)}`}><FileText size={20} /></a>;
  }
  return <a href={src} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`} aria-label={`Abrir prévia de ${assetName(asset)}`}><img src={src} alt={`Prévia de ${assetName(asset)}`} loading="lazy" className="size-full rounded-lg border border-border bg-white object-cover" /></a>;
}

export async function CertificateTemplateManager() {
  const { organization, workspace } = await requireAdminExtensionsWorkspace();
  const assets = workspace.certificate_templates.assets;
  const assignments = workspace.certificate_templates.assignments;
  const assetById = new Map(assets.map((asset) => [text(asset.id), asset]));
  const programs = workspace.programs.map((item) => ({ id: text(item.id), name: text(item.name) }));
  const journeys = workspace.journeys.map((item) => ({ id: text(item.id), name: text(item.name) }));

  return <section id="templates-certificado" className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] scroll-mt-24 gap-4">
    <Card className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><ImageUp size={20} /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Etapa 2 de 3</p><h2 className="mt-1 text-lg font-black text-secondary">Fundo dos certificados</h2><p className="text-sm text-muted">Defina um modelo geral e crie exceções somente quando um programa ou uma jornada precisar de outra aparência.</p><p className="mt-1 text-xs text-muted">As opções de Programa e Jornada vêm das entidades já cadastradas no LMS. A prioridade aplicada é: jornada, programa e, por último, modelo geral.</p></div></div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-3">
        <UploadCard organizationId={organization.organization_id} scopeType="global" title="Modelo geral" description="Usado automaticamente quando não existe uma escolha mais específica." />
        <UploadCard organizationId={organization.organization_id} scopeType="program" title="Modelo de um programa" description="Substitui o modelo geral nas jornadas desse programa." options={programs} />
        <UploadCard organizationId={organization.organization_id} scopeType="journey" title="Modelo de uma jornada" description="Tem prioridade e vale somente para a jornada escolhida." options={journeys} />
      </div>
    </Card>

    <Card className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <div className="min-w-0"><h3 className="font-black text-secondary">Modelos em uso</h3><p className="text-sm text-muted">A plataforma escolhe automaticamente nesta ordem: jornada, programa e modelo geral. Clique na prévia para abrir o arquivo original.</p></div>
      {assignments.map((assignment) => {
        const scopeType = text(assignment.scope_type);
        const scopeId = text(assignment.scope_id);
        const asset = assetById.get(text(assignment.template_asset_id));
        const scopeName = scopeType === "global"
          ? "Modelo geral"
          : scopeType === "program"
            ? text(workspace.programs.find((item) => text(item.id) === scopeId)?.name) || "Programa"
            : text(workspace.journeys.find((item) => text(item.id) === scopeId)?.name) || "Jornada";
        return <article key={text(assignment.id)} className="flex min-w-0 max-w-full flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><PersistedTemplatePreview organizationId={organization.organization_id} asset={asset} className="h-16 w-24 shrink-0" /><div className="min-w-0"><strong className="block text-ink">{scopeName}</strong><span className="block truncate text-sm text-muted">{assetName(asset)}</span>{previewUrl(organization.organization_id, asset) ? <a href={previewUrl(organization.organization_id, asset)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">Visualizar arquivo <ExternalLink size={12} /></a> : null}</div></div><form action={saveExtensionAction} className="min-w-0"><input type="hidden" name="resource_type" value="certificate_template_assignment" /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="scope_type" value={scopeType} /><input type="hidden" name="scope_id" value={scopeId} /><input type="hidden" name="template_asset_id" value="" /><Button variant="secondary" size="sm" type="submit">Remover modelo</Button></form></article>;
      })}
      {assignments.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhum modelo definido. Envie ou reutilize um arquivo abaixo para começar.</p> : null}
    </Card>

    <details className="min-w-0 max-w-full rounded-2xl border border-border bg-white shadow-sm" open={assignments.length === 0}><summary className="cursor-pointer p-4 font-bold text-secondary">Arquivos já enviados</summary><div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t border-border p-4 sm:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => {
      const assetId = text(asset.id);
      const src = previewUrl(organization.organization_id, asset);
      return <article key={assetId} className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-surface-muted"><PersistedTemplatePreview organizationId={organization.organization_id} asset={asset} className="aspect-[1.414/1] w-full rounded-none border-0" /><div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-3"><div className="min-w-0"><strong className="block truncate text-ink">{assetName(asset)}</strong><span className="text-xs text-muted">{text(asset.media_type) === "pdf" ? "PDF" : "Imagem"} · {Math.max(1, Math.round(Number(asset.size_bytes ?? 0) / 1024))} KB</span>{src ? <a href={src} target="_blank" rel="noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs font-bold text-primary hover:underline">Visualizar <ExternalLink size={12} /></a> : null}</div><ExistingAssetAssignment assetId={assetId} programs={programs} journeys={journeys} /></div></article>;
    })}{assets.length === 0 ? <p className="text-sm text-muted">Nenhum arquivo enviado.</p> : null}</div></details>
  </section>;
}

function ExistingAssetAssignment({ assetId, programs, journeys }: { assetId: string; programs: { id: string; name: string }[]; journeys: { id: string; name: string }[] }) {
  return <details className="min-w-0 max-w-full rounded-lg border border-border bg-white"><summary className="cursor-pointer px-3 py-2 text-sm font-bold text-primary">Usar este arquivo</summary><div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t border-border p-3"><form action={saveExtensionAction} className="min-w-0"><input type="hidden" name="resource_type" value="certificate_template_assignment" /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="scope_type" value="global" /><input type="hidden" name="scope_id" value="" /><input type="hidden" name="template_asset_id" value={assetId} /><Button type="submit" variant="secondary" size="sm" className="w-full">Usar como modelo geral</Button></form>{programs.length ? <form action={saveExtensionAction} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"><input type="hidden" name="resource_type" value="certificate_template_assignment" /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="scope_type" value="program" /><input type="hidden" name="template_asset_id" value={assetId} /><Label className="min-w-0 text-xs">Programa<Select name="scope_id" required><option value="">Selecione</option>{programs.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Label><Button type="submit" variant="secondary" size="sm">Usar no programa</Button></form> : null}{journeys.length ? <form action={saveExtensionAction} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"><input type="hidden" name="resource_type" value="certificate_template_assignment" /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="scope_type" value="journey" /><input type="hidden" name="template_asset_id" value={assetId} /><Label className="min-w-0 text-xs">Jornada<Select name="scope_id" required><option value="">Selecione</option>{journeys.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Label><Button type="submit" variant="secondary" size="sm">Usar na jornada</Button></form> : null}</div></details>;
}

function UploadCard({ organizationId, scopeType, title, description, options = [] }: { organizationId: string; scopeType: "global" | "program" | "journey"; title: string; description: string; options?: { id: string; name: string }[] }) {
  return <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] content-start gap-3 rounded-xl border border-border p-4"><div className="min-w-0"><h3 className="font-black text-secondary">{title}</h3><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div><form action="/api/certificate-template-uploads" method="post" encType="multipart/form-data" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3"><input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="scope_type" value={scopeType} /><Label className="min-w-0">Nome do modelo<Input name="name" placeholder="Ex.: Certificado institucional" required /></Label>{scopeType !== "global" ? <Label className="min-w-0">{scopeType === "program" ? "Programa" : "Jornada"}<Select name="scope_id" required><option value="">Selecione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select><span className="text-[11px] font-normal text-muted">{scopeType === "program" ? "A lista usa os programas cadastrados no LMS." : "A lista usa as jornadas cadastradas no LMS."}</span></Label> : null}<FileUploadPreview name="file" label="Imagem de fundo" accept="image/png,image/jpeg,.png,.jpg,.jpeg" required maxSizeBytes={15 * 1024 * 1024} recommendedDimensions="3508 × 2480 px (A4 paisagem)" recommendedAspectRatio="1,414:1" help="Use Imagem de fundo em alta resolução. A prévia aparece antes do envio e permanece visível depois de salvar." /><PendingSubmitButton pendingLabel="Enviando…" className="w-fit">Salvar modelo</PendingSubmitButton></form></div>;
}