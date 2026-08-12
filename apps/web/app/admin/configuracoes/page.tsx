import { Settings2, ShieldCheck, Tags } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { AppShell } from "@/components/app-shell";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";
import { savePlatformSettingsAction } from "./platform-settings-actions";

export const dynamic = "force-dynamic";

function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function numberValue(value: unknown) { return typeof value === "number" ? value : Number(value ?? 0) || 0; }
function booleanValue(value: unknown) { return value === true; }
function objectValue(value: JsonRecord | null) { return value ?? {}; }
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }
function communityUrl(value: unknown) {
  if (!Array.isArray(value)) return "";
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const label = stringValue(record.label).toLocaleLowerCase("pt-BR");
    const url = stringValue(record.url);
    if (label.includes("comunidade") && /^https:\/\//u.test(url)) return url;
  }
  return "";
}

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { auth, workspace } = await requireAdminExtensionsWorkspace();
  const settings = objectValue(workspace.settings);
  const terms = workspace.legal_documents.filter((item) => item.document_type === "terms_of_use");
  const privacy = workspace.legal_documents.filter((item) => item.document_type === "privacy_policy");

  return <AppShell area="admin" email={auth.email}><div className="grid gap-5">
    <PageHeader eyebrow="Ajustes gerais" title="Mais configurações" description="Atualize contatos, comunidade, documentos legais e temas da plataforma." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">As configurações foram atualizadas.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Settings2 className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Contato e identificação</h2><p className="text-sm text-muted">Esses canais aparecem na área de Ajuda do participante.</p></div></div>
      <form action={savePlatformSettingsAction} className="grid gap-3 sm:grid-cols-2">
        <Label>Nome da plataforma<Input name="platform_name" defaultValue={stringValue(settings.platform_name) || "Plataforma Estímulo"} required /></Label>
        <Label>E-mail de suporte<Input name="support_email" type="email" defaultValue={stringValue(settings.support_email)} /></Label>
        <Label>Telefone<Input name="support_phone" defaultValue={stringValue(settings.support_phone)} placeholder="(11) 0000-0000" /></Label>
        <Label>WhatsApp de suporte<Input name="support_whatsapp" defaultValue={stringValue(settings.support_whatsapp)} placeholder="+55 11 90000-0000 ou https://wa.me/..." /></Label>
        <Label>Comunidade no WhatsApp<Input name="community_whatsapp_url" type="url" defaultValue={communityUrl(settings.institutional_links)} placeholder="https://chat.whatsapp.com/..." /><span className="text-[11px] font-normal text-muted">Quando preenchido, aparece como botão separado na Ajuda.</span></Label>
        <Label>Horário de atendimento<Input name="support_hours" defaultValue={stringValue(settings.support_hours)} placeholder="Segunda a sexta, das 9h às 18h" /></Label>
        <details className="sm:col-span-2 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Rodapé e outros links institucionais</summary><div className="grid gap-3 border-t border-border p-3"><Label>Texto do rodapé<Textarea name="footer_text" rows={2} defaultValue={stringValue(settings.footer_text)} /></Label><Label>Links institucionais em JSON<Textarea name="institutional_links" rows={4} defaultValue={pretty(settings.institutional_links, [])} placeholder={'[{"label":"Site","url":"https://..."}]'} /><span className="text-[11px] font-normal text-muted">O link da comunidade acima é mantido automaticamente mesmo ao editar esta lista.</span></Label></div></details>
        <input type="hidden" name="metadata" value={pretty(settings.metadata, {})} />
        <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar contatos</PendingSubmitButton>
      </form>
    </Card>

    <Card className="grid gap-3">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Documentos legais</h2><p className="text-sm text-muted">Abra somente o documento que deseja editar.</p></div></div>
      <LegalDocumentCard type="terms_of_use" title="Termos de Uso" versions={terms} />
      <LegalDocumentCard type="privacy_policy" title="Política de Privacidade" versions={privacy} />
    </Card>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><Tags className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Temas</h2><p className="text-sm text-muted">Temas organizam conteúdos e jornadas.</p></div></div>
      <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="resource_type" value="theme" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="json_fields" value="visual_metadata" />
        <Label>Nome do tema<Input name="name" placeholder="Ex.: Marketing digital" required /></Label>
        <Label>Código<Input name="code" pattern="[a-z][a-z0-9_-]{1,79}" placeholder="marketing_digital" required /></Label>
        <input type="hidden" name="description" value="" /><input type="hidden" name="visual_metadata" value="{}" /><input type="hidden" name="status" value="active" />
        <PendingSubmitButton pendingLabel="Criando…">Adicionar</PendingSubmitButton>
      </form>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{workspace.themes.map((theme) => { const usage = numberValue(theme.library_usage_count) + numberValue(theme.journey_usage_count); return <article key={stringValue(theme.id)} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div><h3 className="font-bold text-ink">{stringValue(theme.name)}</h3><p className="text-xs text-muted">{usage} uso(s)</p></div><form action={saveExtensionAction}><input type="hidden" name="resource_type" value="theme_delete" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="id" value={stringValue(theme.id)} /><Button type="submit" variant="secondary" size="sm" disabled={usage > 0}>{usage > 0 ? "Em uso" : "Excluir"}</Button></form></article>; })}{workspace.themes.length === 0 ? <p className="text-sm text-muted">Nenhum tema cadastrado.</p> : null}</div>
    </Card>
  </div></AppShell>;
}

function LegalDocumentCard({ type, title, versions }: { type: "terms_of_use" | "privacy_policy"; title: string; versions: JsonRecord[] }) {
  const latest = versions[0] ?? {};
  const published = versions.find((item) => item.status === "published");
  return <details className="rounded-xl border border-border"><summary className="cursor-pointer p-3"><span className="flex items-center justify-between gap-3"><strong className="text-secondary">{title}</strong><StatusPill tone={published ? "success" : "warning"}>{published ? `Versão ${numberValue(published.version_number)}` : "Não publicado"}</StatusPill></span></summary><form action={saveExtensionAction} className="grid gap-3 border-t border-border p-4">
    <input type="hidden" name="resource_type" value="legal_document" /><input type="hidden" name="return_to" value="/admin/configuracoes" /><input type="hidden" name="boolean_fields" value="require_reacceptance" /><input type="hidden" name="document_type" value={type} />
    <Label>Título<Input name="title" defaultValue={stringValue(latest.title) || title} required /></Label>
    <Label>Conteúdo<Textarea name="body" rows={10} defaultValue={stringValue(latest.body)} minLength={20} required /></Label>
    <div className="grid gap-3 sm:grid-cols-2"><Label>Como salvar<Select name="status" defaultValue="draft"><option value="draft">Salvar rascunho</option><option value="published">Publicar nova versão</option></Select></Label><label className="flex items-center gap-2 rounded-xl bg-surface-muted p-3 text-sm"><input type="hidden" name="require_reacceptance" value="false" /><input type="checkbox" name="require_reacceptance" value="true" defaultChecked={booleanValue(latest.require_reacceptance)} className="size-4 accent-primary" /><span>Exigir nova aceitação ao publicar</span></label></div>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit">Salvar documento</PendingSubmitButton>
  </form></details>;
}
