import { FileImage, FileText } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function assetName(asset: JsonRecord | undefined) { return text(asset?.name) || text(asset?.original_filename) || "Template"; }

export default async function CertificateTemplatesPage({ searchParams }: { searchParams: Promise<{ templateStatus?: string; codigo?: string }> }) {
  const query = await searchParams;
  const { organization, workspace } = await requireAdminExtensionsWorkspace();
  const assets = workspace.certificate_templates.assets;
  const assignments = workspace.certificate_templates.assignments;
  const assetById = new Map(assets.map((asset) => [text(asset.id), asset]));

  return <div className="grid gap-5">
    <PageHeader eyebrow="Certificados" title="Templates" description="Envie uma imagem ou PDF e escolha onde ela será usada." />
    {query.templateStatus === "enviado" ? <StatusPanel title="Template salvo" tone="success">O arquivo já está em uso.</StatusPanel> : null}
    {query.templateStatus === "erro" ? <StatusPanel title="Não foi possível enviar" tone="warning">Tente novamente. Referência: {query.codigo ?? "UPLOAD_FAILED"}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div><h2 className="font-black text-secondary">Escolha o alcance do template</h2><p className="text-sm text-muted">A jornada substitui o programa; o programa substitui o template global.</p></div>
      <section className="grid gap-3 lg:grid-cols-3">
        <UploadCard organizationId={organization.organization_id} scopeType="global" title="Toda a plataforma" description="Use como padrão geral." />
        <UploadCard organizationId={organization.organization_id} scopeType="program" title="Um programa" description="Use apenas nas jornadas do programa." options={workspace.programs.map((item) => ({ id: text(item.id), name: text(item.name) }))} />
        <UploadCard organizationId={organization.organization_id} scopeType="journey" title="Uma jornada" description="Use somente na jornada escolhida." options={workspace.journeys.map((item) => ({ id: text(item.id), name: text(item.name) }))} />
      </section>
    </Card>

    <Card className="grid gap-3">
      <h2 className="font-black text-secondary">Templates em uso</h2>
      {assignments.map((assignment) => {
        const scopeType = text(assignment.scope_type);
        const scopeId = text(assignment.scope_id);
        const asset = assetById.get(text(assignment.template_asset_id));
        const scopeName = scopeType === "global" ? "Toda a plataforma" : scopeType === "program"
          ? text(workspace.programs.find((item) => text(item.id) === scopeId)?.name) || "Programa"
          : text(workspace.journeys.find((item) => text(item.id) === scopeId)?.name) || "Jornada";
        return <article key={text(assignment.id)} className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{text(asset?.media_type) === "pdf" ? <FileText className="text-primary" size={20} /> : <FileImage className="text-primary" size={20} />}<div><strong className="block text-ink">{scopeName}</strong><span className="text-sm text-muted">{assetName(asset)}</span></div></div><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="certificate_template_assignment" /><input type="hidden" name="return_to" value="/admin/certificados" /><input type="hidden" name="scope_type" value={scopeType} /><input type="hidden" name="scope_id" value={scopeId} /><input type="hidden" name="template_asset_id" value="" /><Button variant="ghost" size="sm" type="submit">Remover</Button></form></article>;
      })}
      {assignments.length === 0 ? <p className="text-sm text-muted">Nenhum template associado.</p> : null}
    </Card>

    <details className="rounded-2xl border border-border bg-white">
      <summary className="cursor-pointer px-5 py-4 font-black text-secondary">Ver arquivos enviados ({assets.length})</summary>
      <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2 xl:grid-cols-3">{assets.map((asset) => <article key={text(asset.id)} className="flex items-center gap-3 rounded-xl bg-surface-muted p-3">{text(asset.media_type) === "pdf" ? <FileText className="text-primary" size={18} /> : <FileImage className="text-primary" size={18} />}<div className="min-w-0"><strong className="block truncate text-sm text-ink">{assetName(asset)}</strong><span className="text-xs text-muted">{text(asset.content_type)}</span></div></article>)}{assets.length === 0 ? <p className="text-sm text-muted">Nenhum arquivo enviado.</p> : null}</div>
    </details>
  </div>;
}

function UploadCard({ organizationId, scopeType, title, description, options = [] }: { organizationId: string; scopeType: "global" | "program" | "journey"; title: string; description: string; options?: { id: string; name: string }[] }) {
  return <div className="grid content-start gap-3 rounded-2xl border border-border bg-surface-muted/40 p-4">
    <div><h3 className="font-black text-secondary">{title}</h3><p className="text-sm text-muted">{description}</p></div>
    <form action="/api/certificate-template-uploads" method="post" encType="multipart/form-data" className="grid gap-3">
      <input type="hidden" name="organization_id" value={organizationId} /><input type="hidden" name="return_to" value="/admin/certificados" /><input type="hidden" name="scope_type" value={scopeType} />
      <Label>Nome<Input name="name" placeholder="Certificado institucional" required /></Label>
      {scopeType !== "global" ? <Label>{scopeType === "program" ? "Programa" : "Jornada"}<Select name="scope_id" required><option value="">Selecione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Label> : null}
      <Label>Arquivo<Input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" required /></Label>
      <PendingSubmitButton pendingLabel="Enviando…" className="w-fit">Enviar</PendingSubmitButton>
    </form>
  </div>;
}
