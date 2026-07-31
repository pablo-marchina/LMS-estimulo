import { Settings2, ShieldCheck, Tags } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function numberValue(value: unknown) { return typeof value === "number" ? value : Number(value ?? 0) || 0; }
function booleanValue(value: unknown) { return value === true; }
function objectValue(value: JsonRecord | null) { return value ?? {}; }
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  const settings = objectValue(workspace.settings);
  const terms = workspace.legal_documents.filter((item) => item.document_type === "terms_of_use");
  const privacy = workspace.legal_documents.filter((item) => item.document_type === "privacy_policy");

  return <div className="grid gap-6">
    <PageHeader eyebrow="Administração" title="Mais configurações" description="Ajustes institucionais, documentos legais e temas reutilizados em conteúdos e jornadas." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">A configuração foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Código: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-5">
      <div className="flex items-start gap-3"><Settings2 className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Identidade e suporte</h2><p className="text-sm text-muted">Essas informações ficam centralizadas e podem ser usadas no rodapé, ajuda e comunicações.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="resource_type" value="platform_settings" />
        <input type="hidden" name="return_to" value="/admin/configuracoes" />
        <input type="hidden" name="json_fields" value="institutional_links,metadata" />
        <Label>Nome da plataforma<Input name="platform_name" defaultValue={stringValue(settings.platform_name) || "Plataforma Estímulo"} required /></Label>
        <Label>E-mail de suporte<Input name="support_email" type="email" defaultValue={stringValue(settings.support_email)} /></Label>
        <Label>Telefone de ajuda<Input name="support_phone" defaultValue={stringValue(settings.support_phone)} placeholder="(11) 0000-0000" /></Label>
        <Label>WhatsApp<Input name="support_whatsapp" defaultValue={stringValue(settings.support_whatsapp)} placeholder="+55 11 90000-0000" /></Label>
        <Label className="sm:col-span-2">Horário de atendimento<Input name="support_hours" defaultValue={stringValue(settings.support_hours)} placeholder="Segunda a sexta, das 9h às 18h" /></Label>
        <Label className="sm:col-span-2">Links institucionais em JSON<Textarea name="institutional_links" rows={5} defaultValue={pretty(settings.institutional_links, [])} placeholder={'[{"label":"Site","url":"https://..."}]'} /><span className="text-[11px] font-normal text-muted">Permite adicionar quantos links forem necessários sem alterar a aplicação.</span></Label>
        <Label className="sm:col-span-2">Texto do rodapé<Textarea name="footer_text" rows={3} defaultValue={stringValue(settings.footer_text)} /></Label>
        <input type="hidden" name="metadata" value={pretty(settings.metadata, {})} />
        <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar configurações</PendingSubmitButton>
      </form>
    </Card>

    <section className="grid gap-4 lg:grid-cols-2">
      <LegalDocumentCard type="terms_of_use" title="Termos de Uso" versions={terms} />
      <LegalDocumentCard type="privacy_policy" title="Política de Privacidade" versions={privacy} />
    </section>

    <Card className="grid gap-5">
      <div className="flex items-start gap-3"><Tags className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Temas</h2><p className="text-sm text-muted">Conteúdos e jornadas poderão selecionar vários temas desta lista. Temas utilizados não podem ser excluídos.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end">
        <input type="hidden" name="resource_type" value="theme" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="json_fields" value="visual_metadata" />
        <Label>Código<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" placeholder="marketing_digital" required /></Label>
        <Label>Nome<Input name="name" placeholder="Marketing digital" required /></Label>
        <Label>Descrição<Input name="description" /></Label>
        <input type="hidden" name="visual_metadata" value="{}" /><input type="hidden" name="status" value="active" />
        <PendingSubmitButton pendingLabel="Criando…">Adicionar tema</PendingSubmitButton>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {workspace.themes.map((theme) => {
          const usage = numberValue(theme.library_usage_count) + numberValue(theme.journey_usage_count);
          return <article key={stringValue(theme.id)} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-ink">{stringValue(theme.name)}</h3><p className="text-xs text-muted">{stringValue(theme.code)}</p></div><StatusPill tone={stringValue(theme.status) === "active" ? "success" : "neutral"}>{stringValue(theme.status)}</StatusPill></div>
            {stringValue(theme.description) ? <p className="mt-3 text-sm text-muted">{stringValue(theme.description)}</p> : null}
            <p className="mt-3 text-xs text-muted">{numberValue(theme.library_usage_count)} conteúdo(s) · {numberValue(theme.journey_usage_count)} jornada(s)</p>
            <form action={saveExtensionAction} className="mt-3">
              <input type="hidden" name="resource_type" value="theme_delete" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="id" value={stringValue(theme.id)} />
              <Button type="submit" variant="secondary" size="sm" disabled={usage > 0}>{usage > 0 ? "Reclassifique antes de excluir" : "Excluir tema"}</Button>
            </form>
          </article>;
        })}
        {workspace.themes.length === 0 ? <p className="text-sm text-muted">Nenhum tema cadastrado.</p> : null}
      </div>
    </Card>
  </div>;
}

function LegalDocumentCard({ type, title, versions }: { type: "terms_of_use" | "privacy_policy"; title: string; versions: JsonRecord[] }) {
  const latest = versions[0] ?? {};
  const published = versions.find((item) => item.status === "published");
  return <Card className="grid gap-4">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" /><div><h2 className="font-black text-secondary">{title}</h2><p className="text-sm text-muted">Rascunho ou publicação versionada com opção de exigir nova aceitação.</p></div></div>
    {published ? <p className="text-xs text-muted">Versão publicada: {numberValue(published.version_number)} · {booleanValue(published.require_reacceptance) ? "nova aceitação obrigatória" : "sem nova aceitação"}</p> : <p className="text-xs text-muted">Nenhuma versão publicada.</p>}
    <form action={saveExtensionAction} className="grid gap-3">
      <input type="hidden" name="resource_type" value="legal_document" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="boolean_fields" value="require_reacceptance" /><input type="hidden" name="document_type" value={type} />
      <Label>Título<Input name="title" defaultValue={stringValue(latest.title) || title} required /></Label>
      <Label>Conteúdo<Textarea name="body" rows={12} defaultValue={stringValue(latest.body)} minLength={20} required /></Label>
      <Label>Estado<Select name="status" defaultValue="draft"><option value="draft">Salvar como rascunho</option><option value="published">Publicar nova versão</option></Select></Label>
      <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="hidden" name="require_reacceptance" value="false" /><input type="checkbox" name="require_reacceptance" value="true" className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Exigir nova aceitação</strong><small className="text-muted">Ao publicar, usuários precisarão aceitar esta versão no próximo acesso.</small></span></label>
      <PendingSubmitButton pendingLabel="Salvando…" className="w-fit">Salvar {title.toLowerCase()}</PendingSubmitButton>
    </form>
  </Card>;
}
