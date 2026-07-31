import { ClipboardCheck, FileUp } from "lucide-react";
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
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function objectValue(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function firstCriterion(configuration: JsonRecord) {
  const rubric = objectValue(configuration.rubric);
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
  const first = criteria[0];
  return first && typeof first === "object" && !Array.isArray(first) ? first as JsonRecord : {};
}
function references(configuration: JsonRecord) {
  return Array.isArray(configuration.reference_material) ? configuration.reference_material.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("\n") : "";
}
const formats = [
  ["text","Texto"], ["external_link","Link"], ["image","Imagem"], ["pdf","PDF"], ["document","Documento"],
  ["spreadsheet","Planilha"], ["code","Código"], ["zip","Arquivo ZIP"], ["audio","Áudio"], ["video","Vídeo"],
] as const;
const statusLabels: Record<string,string> = { submitted: "Enviada", processing: "Em análise", awaiting_human_review: "Aguardando revisão", corrected: "Corrigida", approved: "Aprovada", rejected: "Reprovada", returned: "Devolvida" };

export default async function AdminDeliveriesPage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string }> }) {
  const query = await searchParams;
  const { workspace } = await requireAdminExtensionsWorkspace();

  return <div className="grid gap-5">
    <PageHeader eyebrow="Avaliação" title="Entregas" description="Escolha uma atividade, defina o que será enviado e como a correção funcionará." />
    {query.sucesso ? <StatusPanel title="Alteração salva" tone="success">A configuração foi atualizada.</StatusPanel> : null}
    {query.erro ? <StatusPanel title="Não foi possível salvar" tone="warning">Tente novamente. Referência: {query.erro}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><FileUp className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Criar atividade com entrega</h2><p className="text-sm text-muted">As opções técnicas ficam recolhidas no final do formulário.</p></div></div>
      <DeliveryForm libraryItems={workspace.library_items} activities={workspace.activity_versions} />
    </Card>

    <section className="grid gap-3"><h2 className="text-lg font-black text-secondary">Configurações criadas</h2>{workspace.delivery_configurations.length === 0 ? <Card><p className="text-sm text-muted">Nenhuma entrega configurada.</p></Card> : <div className="grid gap-3 lg:grid-cols-2">{workspace.delivery_configurations.map((configuration) => <Card key={text(configuration.id)} className="grid gap-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-ink">{text(configuration.title)}</h3><p className="text-sm text-muted">{text(configuration.target_title)}</p></div><StatusPill tone={text(configuration.status) === "active" ? "success" : "neutral"}>{text(configuration.status) === "active" ? "Ativa" : text(configuration.status) === "draft" ? "Rascunho" : "Inativa"}</StatusPill></div><p className="text-xs text-muted">{number(configuration.submission_count)} entrega(s) · {text(configuration.grading_mode) === "automatic" ? "Correção automática" : "Com revisão humana"}</p><details className="rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Editar configuração</summary><div className="border-t border-border p-4"><DeliveryForm configuration={configuration} libraryItems={workspace.library_items} activities={workspace.activity_versions} /></div></details></Card>)}</div>}</section>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><ClipboardCheck className="mt-0.5 text-primary" size={20} /><div><h2 className="font-black text-secondary">Entregas recebidas</h2><p className="text-sm text-muted">Revise apenas quando necessário e salve a decisão final.</p></div></div>
      <div className="grid gap-3">{workspace.delivery_submissions.map((submission) => {
        const reviews = Array.isArray(submission.reviews) ? submission.reviews.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
        const aiReview = reviews.find((review) => review.review_type === "ai");
        return <article key={text(submission.id)} className="grid gap-4 rounded-2xl border border-border bg-white p-4 lg:grid-cols-[1fr_1.4fr]">
          <div><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-ink">{text(submission.delivery_title)}</h3><p className="text-sm text-muted">{text(submission.preferred_name) || text(submission.legal_name)}</p></div><StatusPill tone={text(submission.status) === "approved" ? "success" : text(submission.status) === "processing" ? "info" : "warning"}>{statusLabels[text(submission.status)] ?? text(submission.status)}</StatusPill></div><p className="mt-2 text-xs text-muted">Tentativa {number(submission.attempt_number)} · {text(submission.email_normalized)}</p>{aiReview ? <div className="mt-3 rounded-xl bg-surface-muted p-3"><p className="text-sm font-bold text-secondary">Sugestão da IA: {aiReview.score === null ? "sem nota" : `${number(aiReview.score)} / 100`}</p><p className="mt-1 text-xs text-muted">{text(aiReview.feedback)}</p><p className="mt-1 text-[11px] text-muted">Confiança: {number(aiReview.confidence).toFixed(2)}</p></div> : <p className="mt-3 text-sm text-muted">Aguardando análise da IA.</p>}</div>
          <form action={saveExtensionAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="resource_type" value="delivery_review" /><input type="hidden" name="return_to" value="/admin/entregas" /><input type="hidden" name="json_fields" value="criterion_scores,metadata" /><input type="hidden" name="submission_id" value={text(submission.id)} /><input type="hidden" name="criterion_scores" value="[]" /><input type="hidden" name="metadata" value="{}" /><Label>Nota final<Input name="score" type="number" min="0" max="100" step="0.01" defaultValue={submission.final_score === null ? "" : String(number(submission.final_score))} placeholder="0 a 100" /></Label><Label>Decisão<Select name="status" defaultValue={text(submission.status) === "approved" ? "approved" : "corrected"}><option value="corrected">Corrigida</option><option value="approved">Aprovada</option><option value="rejected">Reprovada</option><option value="returned">Pedir ajuste</option></Select></Label><Label className="sm:col-span-2">Feedback ao participante<Textarea name="feedback" rows={3} defaultValue={text(submission.final_feedback)} /></Label><Label className="sm:col-span-2">Motivo da decisão<Input name="change_reason" placeholder="Ex.: nota confirmada após revisão" required /></Label><PendingSubmitButton pendingLabel="Salvando…" size="sm" className="w-fit sm:col-span-2">Salvar revisão</PendingSubmitButton></form>
        </article>;
      })}{workspace.delivery_submissions.length === 0 ? <p className="text-sm text-muted">Nenhuma entrega recebida.</p> : null}</div>
    </Card>
  </div>;
}

function DeliveryForm({ configuration = {}, libraryItems, activities }: { configuration?: JsonRecord; libraryItems: JsonRecord[]; activities: JsonRecord[] }) {
  const targetType = text(configuration.target_type) || "library";
  const targetId = targetType === "library" ? text(configuration.library_item_version_id) : text(configuration.activity_version_id);
  const selectedFormats = Array.isArray(configuration.allowed_submission_types) ? configuration.allowed_submission_types.map(String) : ["text"];
  const criterion = firstCriterion(configuration);
  const points = objectValue(configuration.points_configuration);
  return <form action={saveExtensionAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="resource_type" value="delivery_configuration" /><input type="hidden" name="return_to" value="/admin/entregas" /><input type="hidden" name="array_fields" value="allowed_submission_types,required_submission_types" /><input type="hidden" name="boolean_fields" value="allow_late,allow_resubmit,points_proportional" /><input type="hidden" name="id" value={text(configuration.id)} /><input type="hidden" name="required_submission_types" value="" />
    <Label>Onde será usada?<Select name="target_type" defaultValue={targetType}><option value="library">Conteúdo da biblioteca</option><option value="activity">Atividade de jornada</option></Select></Label>
    <Label>Conteúdo ou atividade<Select name="target_id" defaultValue={targetId} required><option value="">Selecione</option><optgroup label="Biblioteca">{libraryItems.map((item) => <option key={text(item.library_item_version_id)} value={text(item.library_item_version_id)}>{text(item.title)}</option>)}</optgroup><optgroup label="Atividades">{activities.map((item) => <option key={text(item.id)} value={text(item.id)}>{text(item.title)}</option>)}</optgroup></Select></Label>
    <Label className="sm:col-span-2">Nome da entrega<Input name="title" defaultValue={text(configuration.title)} required /></Label><Label className="sm:col-span-2">O que o participante deve fazer?<Textarea name="instructions" rows={4} defaultValue={text(configuration.instructions)} required /></Label>
    <fieldset className="sm:col-span-2 grid gap-2 rounded-xl border border-border p-4"><legend className="px-2 text-sm font-bold text-secondary">O que pode ser enviado?</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{formats.map(([format,label]) => <label key={format} className="flex items-center gap-2 rounded-lg bg-surface-muted p-2 text-sm"><input type="checkbox" name="allowed_submission_types" value={format} defaultChecked={selectedFormats.includes(format)} className="accent-primary" />{label}</label>)}</div></fieldset>
    <Label>Como corrigir?<Select name="grading_mode" defaultValue={text(configuration.grading_mode) || "ai_human_review"}><option value="ai_human_review">IA sugere e uma pessoa aprova</option><option value="automatic">IA publica quando estiver confiante</option><option value="ai_assistant">IA apenas ajuda o avaliador</option></Select></Label><Label>Estado<Select name="status" defaultValue={text(configuration.status) || "active"}><option value="draft">Salvar rascunho</option><option value="active">Ativar</option><option value="inactive">Desativar</option></Select></Label>
    <details className="sm:col-span-2 rounded-xl border border-border bg-surface-muted/40"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-secondary">Opções avançadas</summary><div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
      <Label>Máximo de arquivos<Input name="max_files" type="number" min="0" max="20" defaultValue={String(number(configuration.max_files, 5))} /></Label><Label>Tamanho máximo por arquivo (MB)<Input name="max_file_size_mb" type="number" min="1" max="100" defaultValue={String(Math.max(1, Math.round(number(configuration.max_file_size_bytes, 26214400) / 1024 / 1024)))} /></Label>
      <Label>Tentativas máximas<Input name="max_attempts" type="number" min="1" defaultValue={configuration.max_attempts === null ? "" : String(number(configuration.max_attempts))} placeholder="Sem limite" /></Label><Label>Nota mínima<Input name="passing_score" type="number" min="0" max="100" step="0.01" defaultValue={configuration.passing_score === null ? "" : String(number(configuration.passing_score))} /></Label>
      <Label>Regra da nota<Select name="grade_strategy" defaultValue={text(configuration.grade_strategy) || "highest"}><option value="highest">Maior nota</option><option value="latest">Última tentativa</option><option value="average">Média</option></Select></Label><Label>Critério principal<Input name="rubric_name" defaultValue={text(criterion.name) || "Qualidade da entrega"} /></Label>
      <Label className="sm:col-span-2">O que avaliar?<Textarea name="rubric_description" rows={3} defaultValue={text(criterion.description)} placeholder="Descreva de forma simples o que caracteriza uma boa entrega." /></Label>
      <Label>Início<Input name="starts_at" type="datetime-local" defaultValue={text(configuration.starts_at).slice(0,16)} /></Label><Label>Prazo<Input name="due_at" type="datetime-local" defaultValue={text(configuration.due_at).slice(0,16)} /></Label><Label>Encerramento<Input name="ends_at" type="datetime-local" defaultValue={text(configuration.ends_at).slice(0,16)} /></Label>
      <label className="flex items-center gap-2 text-sm"><input type="hidden" name="allow_late" value="false" /><input type="checkbox" name="allow_late" value="true" defaultChecked={configuration.allow_late === true} className="accent-primary" />Aceitar atraso</label><label className="flex items-center gap-2 text-sm"><input type="hidden" name="allow_resubmit" value="false" /><input type="checkbox" name="allow_resubmit" value="true" defaultChecked={configuration.allow_resubmit !== false} className="accent-primary" />Permitir reenvio</label>
      <Label className="sm:col-span-2">Orientações extras para a IA<Textarea name="ai_instructions" rows={3} defaultValue={text(configuration.ai_instructions)} /></Label><Label className="sm:col-span-2">Materiais de referência<Textarea name="reference_material_text" rows={3} defaultValue={references(configuration)} placeholder="Um link ou referência por linha" /></Label>
      <Label>Pontos ao enviar<Input name="points_on_submit" type="number" min="0" defaultValue={String(number(points.on_submit))} /></Label><Label>Pontos ao aprovar<Input name="points_on_approve" type="number" min="0" defaultValue={String(number(points.on_approve))} /></Label><Label>Máximo de pontos<Input name="max_points" type="number" min="0" defaultValue={String(number(points.max_points))} /></Label><label className="flex items-center gap-2 text-sm"><input type="hidden" name="points_proportional" value="false" /><input type="checkbox" name="points_proportional" value="true" defaultChecked={points.proportional_to_score === true} className="accent-primary" />Pontos proporcionais à nota</label>
    </div></details>
    <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2">Salvar entrega</PendingSubmitButton>
  </form>;
}
