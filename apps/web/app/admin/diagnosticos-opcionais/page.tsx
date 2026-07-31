import { ClipboardList, UserRoundCheck } from "lucide-react";
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
function pretty(value: unknown, fallback: unknown) { return JSON.stringify(value ?? fallback, null, 2); }

export default async function OptionalDiagnosticsAdminPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();
  return <div className="grid gap-6">
    <PageHeader eyebrow="Perfil do participante" title="Diagnósticos opcionais" description="Disponibilize avaliações voluntárias no perfil sem alterar arquétipo, elegibilidade ou acesso a jornadas." />
    {query.sucesso ? <StatusPanel title="Configuração salva" tone="success">A disponibilidade do diagnóstico foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Código: {query.erro}</StatusPanel> : null}
    <StatusPanel title="Isolamento do diagnóstico principal" tone="info">Resultados opcionais ficam em sessões próprias. Nenhuma ação deste módulo escreve em atribuições de arquétipo ou restrições de jornada.</StatusPanel>

    <Card className="grid gap-5"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Nova disponibilidade</h2><p className="text-sm text-muted">Use um diagnóstico publicado e defina quem poderá encontrá-lo na aba de perfil.</p></div></div><OptionalDiagnosticForm diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></Card>

    <section className="grid gap-4"><div><p className="brand-kicker">Disponibilizados</p><h2 className="display-font mt-1 text-2xl text-secondary">Diagnósticos no perfil</h2></div>{workspace.optional_diagnostics.length === 0 ? <Card><p className="text-sm text-muted">Nenhum diagnóstico opcional configurado.</p></Card> : <div className="grid gap-4 lg:grid-cols-2">{workspace.optional_diagnostics.map((item) => <Card key={text(item.id)} className="grid gap-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{text(item.display_title)}</h3><p className="text-sm text-muted">{text(item.diagnostic_name)} · versão {number(item.diagnostic_version_number)}</p></div><StatusPill tone={text(item.status) === "published" ? "success" : "neutral"}>{text(item.status)}</StatusPill></div><p className="text-sm text-muted">{text(item.display_description)}</p><p className="text-xs text-muted">{number(item.session_count)} sessão(ões) · {item.max_attempts === null ? "tentativas ilimitadas" : `${number(item.max_attempts)} tentativa(s)`}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-bold text-secondary">Editar disponibilidade</summary><div className="border-t border-border p-4"><OptionalDiagnosticForm item={item} diagnosticVersions={workspace.diagnostic_versions} participants={workspace.participants} /></div></details></Card>)}</div>}</section>
  </div>;
}

function OptionalDiagnosticForm({ item = {}, diagnosticVersions, participants }: { item?: JsonRecord; diagnosticVersions: JsonRecord[]; participants: Array<{ user_account_id: string; name: string; email: string }> }) {
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="optional_diagnostic" /><input type="hidden" name="return_to" value="/admin/diagnosticos-opcionais" /><input type="hidden" name="json_fields" value="audience" /><input type="hidden" name="id" value={text(item.id)} />
    <Label className="sm:col-span-2">Diagnóstico publicado<Select name="diagnostic_version_id" defaultValue={text(item.diagnostic_version_id)} required><option value="">Selecione</option>{diagnosticVersions.map((version) => <option key={text(version.id)} value={text(version.id)}>{text(version.name)} · versão {number(version.version_number)}</option>)}</Select></Label>
    <Label className="sm:col-span-2">Título exibido<Input name="display_title" defaultValue={text(item.display_title)} required /></Label><Label className="sm:col-span-2">Descrição<Textarea name="display_description" rows={4} defaultValue={text(item.display_description)} /></Label>
    <Label>Início<Input name="starts_at" type="datetime-local" defaultValue={text(item.starts_at).slice(0,16)} /></Label><Label>Fim<Input name="ends_at" type="datetime-local" defaultValue={text(item.ends_at).slice(0,16)} /></Label>
    <Label>Tentativas máximas<Input name="max_attempts" type="number" min="1" defaultValue={item.max_attempts === null ? "" : String(number(item.max_attempts))} placeholder="Vazio = ilimitadas" /></Label><Label>Intervalo para refazer (dias)<Input name="retry_interval_days" type="number" min="0" defaultValue={String(number(item.retry_interval_days))} /></Label>
    <Label>Pontos por conclusão<Input name="points_on_completion" type="number" min="0" defaultValue={String(number(item.points_on_completion))} /></Label><Label>Estado<Select name="status" defaultValue={text(item.status) || "draft"}><option value="draft">Rascunho</option><option value="published">Publicado no perfil</option><option value="inactive">Inativo</option></Select></Label>
    <input type="hidden" name="show_result" value={item.show_result === false ? "false" : "true"} />
    <Label className="sm:col-span-2">Público em JSON<Textarea name="audience" rows={5} defaultValue={pretty(item.audience, { type: "all" })} /><span className="text-[11px] font-normal text-muted">Todos: {`{"type":"all"}`}. Usuários selecionados: {`{"type":"users","user_ids":["uuid"]}`}.</span></Label>
    <details className="sm:col-span-2 rounded-xl border border-border"><summary className="cursor-pointer p-3 text-sm font-semibold text-secondary"><span className="inline-flex items-center gap-2"><UserRoundCheck size={16} />Referência de usuários</span></summary><div className="max-h-56 overflow-auto border-t border-border p-3 text-xs text-muted">{participants.map((participant) => <p key={participant.user_account_id}><code>{participant.user_account_id}</code> · {participant.name} · {participant.email}</p>)}</div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar disponibilidade</PendingSubmitButton>
  </form>;
}
