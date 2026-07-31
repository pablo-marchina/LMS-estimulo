import { randomUUID } from "node:crypto";
import { Bot, ClipboardCheck, KeyRound, ShieldCheck } from "lucide-react";
import { saveExtensionAction } from "@/app/admin/extension-actions";
import { saveAiGradingProviderAction } from "@/app/admin/operacao/ai-grading-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminAiGradingProvider, JsonRecord } from "@/lib/extensions/runtime";

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function record(value: unknown): JsonRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function confidenceLabel(value: unknown) { const score = number(value); return score >= .8 ? "Alta" : score >= .55 ? "Média" : "Baixa"; }

const submissionLabels: Record<string,string> = { pending: "Recebida", submitted: "Recebida", processing: "Em análise", grading: "Em correção", awaiting_human_review: "Aguardando revisão humana", corrected: "Corrigida", approved: "Aprovada", rejected: "Reprovada", returned: "Devolvida para ajuste" };

export function AdminDeliveryOperations({
  provider,
  submissions,
  canReview,
  success,
  error,
}: {
  provider: AdminAiGradingProvider;
  submissions: JsonRecord[];
  canReview: boolean;
  success?: string;
  error?: string;
}) {
  return <div className="grid gap-5">
    {success === "provedor_ia_salvo" ? <StatusPanel title="Provedor de IA atualizado" tone="success">As próximas correções usarão esta configuração. A chave permanece oculta.</StatusPanel> : null}
    {success === "delivery_review" ? <StatusPanel title="Revisão salva" tone="success">A decisão final foi registrada para o participante.</StatusPanel> : null}
    {error ? <StatusPanel title="Não foi possível concluir" tone="warning">{error === "chave_ia_obrigatoria" ? "Informe a chave na primeira configuração." : error === "configuracao_ia_invalida" ? "Use um endpoint HTTPS público e informe o modelo." : error === "sem_permissao" ? "Seu perfil não possui permissão para corrigir entregas." : "A configuração atual foi preservada. Revise os campos e tente novamente."}</StatusPanel> : null}

    <Card className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Bot size={19} /></span><div><h2 className="text-lg font-black text-secondary">IA usada nas correções</h2><p className="text-sm text-muted">Conecte uma API compatível com Chat Completions da OpenAI. Código e arquivos enviados nunca são executados.</p></div></div><StatusPill tone={provider.configured && provider.status === "active" ? "success" : "warning"}>{provider.configured && provider.status === "active" ? "Ativa" : "Revisão humana"}</StatusPill></div>
      {canReview ? <form action={saveAiGradingProviderAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        <Label>Nome do provedor<Input name="provider_name" defaultValue={provider.provider_name} placeholder="Ex.: OpenAI" required /></Label>
        <Label>Modelo<Input name="model_name" defaultValue={provider.model_name} placeholder="Ex.: gpt-5-mini" required /></Label>
        <Label className="sm:col-span-2">Endpoint HTTPS<Input name="endpoint_url" type="url" defaultValue={provider.endpoint_url} placeholder="https://api.exemplo.com/v1/chat/completions" required /><span className="text-[11px] font-normal text-muted">Endereços locais ou redes privadas são bloqueados.</span></Label>
        <Label>Chave da API<Input name="api_key" type="password" autoComplete="new-password" placeholder={provider.api_key_last_four ? `Mantida · termina em ${provider.api_key_last_four}` : "Obrigatória na primeira configuração"} /><span className="text-[11px] font-normal text-muted">Deixe vazio para manter a chave atual. Ela é cifrada e nunca reaparece nesta tela.</span></Label>
        <Label>Estado<Select name="status" defaultValue={provider.status}><option value="active">Usar nas próximas correções</option><option value="inactive">Desativar e encaminhar para revisão humana</option></Select></Label>
        <PendingSubmitButton pendingLabel="Salvando…" className="w-fit sm:col-span-2" icon={<KeyRound size={15} />}>Salvar provedor</PendingSubmitButton>
      </form> : <p className="rounded-xl bg-surface-muted p-3 text-sm text-muted">Somente pessoas com permissão de revisão podem alterar o provedor.</p>}
      <div className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-xs leading-5 text-success"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><p>Em qualquer falha de conexão, JSON inválido, baixa confiança ou ausência de evidência, a plataforma não inventa uma nota: a entrega passa para revisão humana.</p></div>
    </Card>

    <Card className="grid gap-4">
      <div className="flex items-start gap-3"><ClipboardCheck className="mt-0.5 text-primary" /><div><h2 className="text-lg font-black text-secondary">Entregas recebidas pelo sistema configurável</h2><p className="text-sm text-muted">Confira a sugestão da IA e registre a decisão final. A nota automática só é publicada quando a regra da atividade permite e a confiança é suficiente.</p></div></div>
      {submissions.map((submission) => { const reviews = records(submission.reviews); const aiReview = reviews.find((review) => review.review_type === "ai"); const status = text(submission.status); return <details key={text(submission.id)} className="rounded-xl border border-border"><summary className="cursor-pointer p-3"><span className="flex flex-wrap items-center justify-between gap-3"><span><strong className="block text-ink">{text(submission.preferred_name) || text(submission.legal_name) || "Participante"}</strong><small className="text-muted">{text(submission.delivery_title)} · tentativa {number(submission.attempt_number,1)}</small></span><StatusPill tone={status === "approved" ? "success" : ["processing","grading"].includes(status) ? "info" : "warning"}>{submissionLabels[status] ?? "Em revisão"}</StatusPill></span></summary><div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2"><div className="rounded-xl bg-surface-muted p-3"><h3 className="font-bold text-secondary">Sugestão da IA</h3>{aiReview ? <><p className="mt-2 text-2xl font-black text-secondary">{aiReview.score === null ? "Sem nota" : `${number(aiReview.score).toFixed(1)} / 100`}</p><p className="mt-2 whitespace-pre-line text-sm text-muted">{text(aiReview.feedback)}</p><p className="mt-2 text-xs text-muted">Confiança: {confidenceLabel(aiReview.confidence)}</p></> : <p className="mt-2 text-sm text-muted">Aguardando análise ou revisão exclusivamente humana.</p>}</div>{canReview ? <form action={saveExtensionAction} className="grid gap-2"><input type="hidden" name="resource_type" value="delivery_review" /><input type="hidden" name="return_to" value="/admin/operacao?area=praticas" /><input type="hidden" name="json_fields" value="criterion_scores,metadata" /><input type="hidden" name="submission_id" value={text(submission.id)} /><input type="hidden" name="criterion_scores" value="[]" /><input type="hidden" name="metadata" value="{}" /><Label>Nota<Input name="score" type="number" min="0" max="100" step="0.01" defaultValue={submission.final_score === null ? "" : String(number(submission.final_score))} /></Label><Label>Comentário para o participante<Textarea name="feedback" rows={3} defaultValue={text(submission.final_feedback)} /></Label><Label>Decisão<Select name="status" defaultValue={status === "approved" ? "approved" : "corrected"}><option value="corrected">Corrigida</option><option value="approved">Aprovada</option><option value="rejected">Reprovada</option><option value="returned">Devolver para ajuste</option></Select></Label><Label>Motivo interno<Input name="change_reason" required placeholder="Explique brevemente a decisão." /></Label><PendingSubmitButton pendingLabel="Salvando…" size="sm">Salvar revisão</PendingSubmitButton></form> : <p className="rounded-xl bg-surface-muted p-3 text-sm text-muted">Você pode consultar, mas não registrar a decisão final.</p>}</div></details>; })}
      {submissions.length === 0 ? <p className="text-sm text-muted">Nenhuma entrega configurável recebida.</p> : null}
    </Card>
  </div>;
}
