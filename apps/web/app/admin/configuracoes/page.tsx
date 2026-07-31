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
function numberValue(value: unknown) { return Number(value ?? 0) || 0; }
function booleanValue(value: unknown) { return value === true; }
function objectValue(value: JsonRecord | null) { return value ?? {}; }
function firstInstitutionalLink(settings: JsonRecord) {
  const links = Array.isArray(settings.institutional_links) ? settings.institutional_links : [];
  const first = links[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as JsonRecord : {};
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  const settings = objectValue(workspace.settings);
  const link = firstInstitutionalLink(settings);
  const terms = workspace.legal_documents.filter((item) => item.document_type === "terms_of_use");
  const privacy = workspace.legal_documents.filter((item) => item.document_type === "privacy_policy");

  return <div className="grid gap-5">
    <PageHeader eyebrow="Configurações" title="Informações gerais" description="Atualize contatos, documentos legais e temas usados na plataforma." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">A configuração foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Settings2 className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Contato e identidade</h2><p className="text-sm text-muted">Preencha apenas o que será mostrado aos participantes.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="resource_type" value="platform_settings" />
        <input type="hidden" name="return_to" value="/admin/configuracoes" />
        <Label>Nome da plataforma<Input name="platform_name" defaultValue={stringValue(settings.platform_name) || "Plataforma Estímulo"} required /></Label>
        <Label>E-mail de suporte<Input name="support_email" type="email" defaultValue={stringValue(settings.support_email)} /></Label>
        <Label>Telefone de ajuda<Input name="support_phone" defaultValue={stringValue(settings.support_phone)} placeholder="(11) 0000-0000" /></Label>
        <Label>WhatsApp<Input name="support_whatsapp" defaultValue={stringValue(settings.support_whatsapp)} placeholder="(11) 90000-0000" /></Label>
        <Label className="sm:col-span-2">Horário de atendimento<Input name="support_hours" defaultValue={stringValue(settings.support_hours)} placeholder="Segunda a sexta, das 9h às 18h" /></Label>
        <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/40">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Mais opções</summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Label>Nome de um link institucional<Input name="institutional_link_label" defaultValue={stringValue(link.label)} placeholder="Site da Estímulo" /></Label>
            <Label>Endereço do link<Input name="institutional_link_url" type="url" defaultValue={stringValue(link.url)} placeholder="https://..." /></Label>
            <Label className="sm:col-span-2">Texto do rodapé<Textarea name="footer_text" rows={2} defaultValue={stringValue(settings.footer_text)} /></Label>
          </div>
        </details>
        <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar</PendingSubmitButton>
      </form>
    </Card>

    <section className="grid gap-4 lg:grid-cols-2">
      <LegalDocumentCard type="terms_of_use" title="Termos de Uso" versions={terms} />
      <LegalDocumentCard type="privacy_policy" title="Política de Privacidade" versions={privacy} />
    </section>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Tags className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Temas</h2><p className="text-sm text-muted">Crie temas para organizar conteúdos e jornadas.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
        <input type="hidden" name="resource_type" value="theme" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="status" value="active" />
        <Label>Nome do tema<Input name="name" placeholder="Marketing digital" required /></Label>
        <Label>Descrição curta<Input name="description" placeholder="Opcional" /></Label>
        <PendingSubmitButton pendingLabel="Criando…">Adicionar</PendingSubmitButton>
      </form>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {workspace.themes.map((theme) => {
          const usage = numberValue(theme.library_usage_count) + numberValue(theme.journey_usage_count);
          return <article key={stringValue(theme.id)} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-bold text-ink">{stringValue(theme.name)}</h3><StatusPill tone={stringValue(theme.status) === "active" ? "success" : "neutral"}>{stringValue(theme.status)}</StatusPill></div><p className="text-xs text-muted">Usado em {usage} item(ns)</p></div>
            <form action={saveExtensionAction}><input type="hidden" name="resource_type" value="theme_delete" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="id" value={stringValue(theme.id)} /><Button type="submit" variant="ghost" size="sm" disabled={usage > 0}>{usage > 0 ? "Em uso" : "Excluir"}</Button></form>
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
  return <Card className="grid gap-3">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" size={20} /><div className="min-w-0 flex-1"><h2 className="font-black text-secondary">{title}</h2><p className="text-xs text-muted">{published ? `Versão ${numberValue(published.version_number)} publicada` : "Ainda não publicado"}</p></div></div>
    <details className="rounded-xl border border-border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar documento</summary>
      <form action={saveExtensionAction} className="grid gap-3 border-t border-border p-4">
        <input type="hidden" name="resource_type" value="legal_document" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="boolean_fields" value="require_reacceptance" /><input type="hidden" name="document_type" value={type} />
        <Label>Título<Input name="title" defaultValue={stringValue(latest.title) || title} required /></Label>
        <Label>Texto<Textarea name="body" rows={10} defaultValue={stringValue(latest.body)} minLength={20} required /></Label>
        <Label>O que fazer?<Select name="status" defaultValue="draft"><option value="draft">Salvar rascunho</option><option value="published">Publicar nova versão</option></Select></Label>
        <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm text-ink"><input type="hidden" name="require_reacceptance" value="false" /><input type="checkbox" name="require_reacceptance" value="true" defaultChecked={booleanValue(latest.require_reacceptance)} className="mt-0.5 size-4 accent-primary" /><span><strong className="block">Pedir nova aceitação</strong><small className="text-muted">Use quando a mudança for importante.</small></span></label>
        <PendingSubmitButton pendingLabel="Salvando…" className="w-fit">Salvar</PendingSubmitButton>
      </form>
    </details>
  </Card>;
}
