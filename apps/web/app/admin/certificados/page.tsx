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
function date(value: unknown) {
  const raw = text(value);
  if (!raw) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(raw));
}
function assetName(asset: JsonRecord | undefined) { return text(asset?.name) || text(asset?.original_filename) || "Template"; }

export default async function CertificateTemplatesPage({ searchParams }: { searchParams: Promise<{ templateStatus?: string; codigo?: string }> }) {
  const query = await searchParams;
  const { organization, workspace } = await requireAdminExtensionsWorkspace();
  const assets = workspace.certificate_templates.assets;
  const assignments = workspace.certificate_templates.assignments;
  const assetById = new Map(assets.map((asset) => [text(asset.id), asset]));

  return <div className="grid gap-6">
    <PageHeader eyebrow="Administração" title="Templates de certificados" description="Envie PDF ou imagem e defina o fundo global, por programa ou por jornada. Jornada tem precedência sobre programa, que tem precedência sobre o global." />
    {query.templateStatus === "enviado" ? <StatusPanel title="Template salvo" tone="success">O arquivo foi enviado e associado ao escopo escolhido.</StatusPanel> : null}
    {query.templateStatus === "erro" ? <StatusPanel title="Falha no upload" tone="warning">Código: {query.codigo ?? "CERTIFICATE_TEMPLATE_UPLOAD_FAILED"}</StatusPanel> : null}

    <section className="grid gap-4 lg:grid-cols-3">
      <UploadCard organizationId={organization.organization_id} scopeType="global" title="Template global" description="Usado quando programa e jornada não possuem template próprio." />
      <UploadCard organizationId={organization.organization_id} scopeType="program" title="Template por programa" description="Substitui o global para jornadas do programa." options={workspace.programs.map((item) => ({ id: text(item.id), name: text(item.name) }))} />
      <UploadCard organizationId={organization.organization_id} scopeType="journey" title="Template por jornada" description="Tem a maior prioridade para a jornada selecionada." options={workspace.journeys.map((item) => ({ id: text(item.id), name: text(item.name) }))} />
    </section>

    <Card className="grid gap-4">
      <div><h2 className="text-lg font-black text-secondary">Associações ativas</h2><p className="text-sm text-muted">Remover uma associação reativa automaticamente o fallback do escopo superior.</p></div>
      <div className="grid gap-3">
        {assignments.map((assignment) => {
          const scopeType = text(assignment.scope_type);
          const scopeId = text(assignment.scope_id);
          const asset = assetById.get(text(assignment.template_asset_id));
          const scopeName = scopeType === "global" ? "Global" : scopeType === "program"
            ? text(workspace.programs.find((item) => text(item.id) === scopeId)?.name) || "Programa"
            : text(workspace.journeys.find((item) => text(item.id) === scopeId)?.name) || "Jornada";
          return <article key={text(assignment.id)} className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">{text(asset?.media_type) === "pdf" ? <FileText className="text-primary" /> : <FileImage className="text-primary" />}<div><strong className="block text-ink">{scopeName}</strong><span className="text-sm text-muted">{assetName(asset)} · atualizado em {date(assignment.updated_at ?? assignment.created_at)}</span></div></div>
            <form action={saveExtensionAction}>
              <input type="hidden" name="resource_type" value="certificate_template_assignment" />
              <input type="hidden" name="return_to" value="/admin/certificados" />
              <input type="hidden" name="scope_type" value={scopeType} />
              <input type="hidden" name="scope_id" value={scopeId} />
              <input type="hidden" name="template_asset_id" value="" />
              <Button variant="secondary" size="sm" type="submit">Remover associação</Button>
            </form>
          </article>;
        })}
        {assignments.length === 0 ? <p className="text-sm text-muted">Nenhum template associado.</p> : null}
      </div>
    </Card>

    <Card className="grid gap-4">
      <div><h2 className="text-lg font-black text-secondary">Arquivos registrados</h2><p className="text-sm text-muted">PDF, PNG, JPG e WebP, com até 15 MB.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => <article key={text(asset.id)} className="rounded-2xl border border-border p-4"><div className="flex items-start gap-3">{text(asset.media_type) === "pdf" ? <FileText className="text-primary" /> : <FileImage className="text-primary" />}<div><strong className="block text-ink">{assetName(asset)}</strong><span className="text-xs text-muted">{text(asset.content_type)} · {Math.max(1, Math.round(Number(asset.size_bytes ?? 0) / 1024))} KB</span></div></div></article>)}
        {assets.length === 0 ? <p className="text-sm text-muted">Nenhum arquivo registrado.</p> : null}
      </div>
    </Card>
  </div>;
}

function UploadCard({ organizationId, scopeType, title, description, options = [] }: { organizationId: string; scopeType: "global" | "program" | "journey"; title: string; description: string; options?: { id: string; name: string }[] }) {
  return <Card className="grid content-start gap-4">
    <div><h2 className="font-black text-secondary">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>
    <form action="/api/certificate-template-uploads" method="post" encType="multipart/form-data" className="grid gap-3">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="return_to" value="/admin/certificados" />
      <input type="hidden" name="scope_type" value={scopeType} />
      <Label>Nome do template<Input name="name" placeholder="Certificado institucional" required /></Label>
      {scopeType !== "global" ? <Label>{scopeType === "program" ? "Programa" : "Jornada"}<Select name="scope_id" required><option value="">Selecione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select></Label> : null}
      <Label>Arquivo<Input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" required /></Label>
      <PendingSubmitButton pendingLabel="Enviando…" className="w-fit">Enviar e associar</PendingSubmitButton>
    </form>
  </Card>;
}
