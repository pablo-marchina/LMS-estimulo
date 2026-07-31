import { ClipboardList } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireAdminExtensionsWorkspace } from "@/lib/extensions/admin-context";
import type { JsonRecord } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function audience(item: JsonRecord) { return item.audience && typeof item.audience === "object" && !Array.isArray(item.audience) ? item.audience as JsonRecord : {}; }
function audienceUsers(item: JsonRecord) { const current = audience(item).user_ids; return Array.isArray(current) ? current.map(String) : []; }

export default async function OptionalDiagnosticsAdminPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  return <div className="grid gap-5">
    <PageHeader eyebrow="Perfil" title="Diagnósticos opcionais" description="Escolha um diagnóstico publicado e decida quem poderá encontrá-lo no perfil." />
    {query.sucesso ? <StatusPanel title="Configuração salva" tone="success">A disponibilidade foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Adicionar ao perfil</h2><p className="text-sm text-muted">O resultado não muda arquétipo nem acesso a jornadas.</p></div></div><OptionalDiagnosticForm diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></Card>

    <section className="grid gap-3"><h2 className="text-lg font-black text-secondary">Disponíveis no perfil</h2>{workspace.optional_diagnostics.length === 0 ? <Card><p className="text-sm text-muted">Nenhum diagnóstico opcional configurado.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.optional_diagnostics.map((item) => <Card key={text(item.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{text(item.display_title)}</h3><p className="text-sm text-muted">{text(item.diagnostic_name)}</p></div><StatusPill tone={text(item.status) === "published" ? "success" : "neutral"}>{text(item.status) === "published" ? "Publicado" : text(item.status) === "inactive" ? "Inativo" : "Rascunho"}</StatusPill></div><p className="text-xs text-muted">{number(item.session_count)} realização(ões)</p><details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar</summary><div className="border-t border-border p-4"><OptionalDiagnosticForm item={item} diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></div></details></Card>)}</div>}</section>
  </div>;
}

function OptionalDiagnosticForm({ item = {}, diagnosticVersions, participants }: { item?: JsonRecord; diagnosticVersions: JsonRecord[]; participants: Array<{ user_account_id: string; name: string; email: string }> }) {
  const itemAudience = audience(item);
  const audienceType = text(itemAudience.type) === "users" ? "users" : "all";
  const selectedUsers = audienceUsers(item);
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="optional_diagnostic" /><input type="hidden" name="return_to" value="/admin/diagnosticos-opcionais" /><input type="hidden" name="array_fields" value="audience_user_ids" /><input type="hidden" name="boolean_fields" value="show_result" /><input type="hidden" name="id" value={text(item.id)} />
    <Label className="sm:col-span-2">Diagnóstico<Select name="diagnostic_version_id" defaultValue={text(item.diagnostic_version_id)} required><option value="">Selecione</option>{diagnosticVersions.map((version) => <option key={text(version.id)} value={text(version.id)}>{text(version.name)} · versão {number(version.version_number)}</option>)}</Select></Label>
    <Label className="sm:col-span-2">Título mostrado ao participante<Input name="display_title" defaultValue={text(item.display_title)} required /></Label>
    <Label className="sm:col-span-2">Descrição curta<Textarea name="display_description" rows={2} defaultValue={text(item.display_description)} /></Label>
    <Label>Quem pode ver?<Select name="audience_type" defaultValue={audienceType}><option value="all">Todos os participantes</option><option value="users">Somente pessoas selecionadas</option></Select></Label>
    <Label>Estado<Select name="status" defaultValue={text(item.status) || "draft"}><option value="draft">Salvar rascunho</option><option value="published">Publicar no perfil</option><option value="inactive">Ocultar</option></Select></Label>
    <label className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-surface-muted p-3 text-sm"><input type="hidden" name="show_result" value="false" /><input type="checkbox" name="show_result" value="true" defaultChecked={item.show_result !== false} className="accent-primary" />Mostrar o resultado ao participante</label>
    <details className="sm:col-span-2 rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Selecionar pessoas</summary><div className="grid max-h-56 gap-2 overflow-y-auto border-t border-border p-3 sm:grid-cols-2">{participants.map((participant) => <label key={participant.user_account_id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-surface-muted"><input type="checkbox" name="audience_user_ids" value={participant.user_account_id} defaultChecked={selectedUsers.includes(participant.user_account_id)} className="mt-0.5 accent-primary" /><span><strong className="block text-ink">{participant.name}</strong><small className="text-muted">{participant.email}</small></span></label>)}</div></details>
    <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/40"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Opções avançadas</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2"><Label>Início<Input name="starts_at" type="datetime-local" defaultValue={text(item.starts_at).slice(0,16)} /></Label><Label>Fim<Input name="ends_at" type="datetime-local" defaultValue={text(item.ends_at).slice(0,16)} /></Label><Label>Tentativas máximas<Input name="max_attempts" type="number" min="1" defaultValue={item.max_attempts === null ? "" : String(number(item.max_attempts))} placeholder="Sem limite" /></Label><Label>Intervalo para refazer (dias)<Input name="retry_interval_days" type="number" min="0" defaultValue={String(number(item.retry_interval_days))} /></Label><Label>Pontos por conclusão<Input name="points_on_completion" type="number" min="0" defaultValue={String(number(item.points_on_completion))} /></Label></div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar</PendingSubmitButton>
  </form>;
}
