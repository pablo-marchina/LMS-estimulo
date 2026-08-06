import { FileCheck2, FileUp, Sparkles } from "lucide-react";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  processing: "Em correção por IA",
  ai_graded: "Corrigida pela IA",
  awaiting_human_review: "Aguardando revisão humana",
  corrected: "Corrigida",
  approved: "Aprovada",
  rejected: "Reprovada",
  returned: "Devolvida para ajuste",
  cancelled: "Cancelada",
  upload_pending: "Envio pendente",
  available: "Disponível",
  awaiting_review: "Aguardando revisão",
};

function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

function acceptedFileTypes(formats: string[]) {
  const values = formats.flatMap((format) => {
    if (format === "pdf") return [".pdf", "application/pdf"];
    if (format === "image") return [".png", ".jpg", ".jpeg", ".webp", "image/png", "image/jpeg", "image/webp"];
    if (format === "document") return [".doc", ".docx", ".odt", ".txt", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (format === "spreadsheet") return [".xls", ".xlsx", ".csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
    if (format === "presentation") return [".ppt", ".pptx", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (format === "video") return [".mp4", ".webm", "video/mp4", "video/webm"];
    if (format.startsWith(".")) return [format];
    return [];
  });
  return [...new Set(values)].join(",") || ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.xls,.xlsx,.csv,.ppt,.pptx,.mp4,.webm";
}

function statusTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (status === "approved" || status === "available") return "success";
  if (["rejected", "returned", "cancelled", "upload_pending"].includes(status)) return "warning";
  if (["processing", "awaiting_human_review", "awaiting_review", "submitted"].includes(status)) return "info";
  return "neutral";
}

export async function ParticipantProfileMaterials() {
  const auth = await requireParticipantContext();
  const workspace = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id);

  return (
    <section id="materiais-enviados" aria-labelledby="materiais-enviados-titulo" className="grid scroll-mt-24 gap-5">
      <div>
        <p className="brand-kicker">Aplicação e acompanhamento</p>
        <h2 id="materiais-enviados-titulo" className="display-font mt-1 text-2xl text-secondary">Meus materiais enviados</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Envie respostas, arquivos e links das atividades e acompanhe a correção sem sair do seu perfil.</p>
      </div>

      {workspace.deliveries.length === 0 ? (
        <EmptyState icon={<FileUp size={22} />} title="Nenhum material solicitado" tone="info">As atividades que aceitam entrega aparecerão aqui quando forem publicadas para você.</EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workspace.deliveries.map((delivery) => <DeliveryCard key={text(delivery.id)} delivery={delivery} />)}
        </div>
      )}
    </section>
  );
}

function DeliveryCard({ delivery }: { delivery: JsonRecord }) {
  const submissions = records(delivery.submissions);
  const latest = submissions[0];
  const allowed = Array.isArray(delivery.allowed_submission_types) ? delivery.allowed_submission_types.map(String) : ["text"];
  const attempts = delivery.max_attempts === null ? "Tentativas ilimitadas" : `${number(delivery.max_attempts)} tentativa(s)`;

  return (
    <Card className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileUp size={20} /></span>
          <div><h3 className="font-black text-ink">{text(delivery.title)}</h3><p className="text-sm text-muted">{text(delivery.target_title)} · {text(delivery.target_type) === "library" ? "Biblioteca" : "Jornada"}</p></div>
        </div>
        {latest ? <StatusPill tone={statusTone(text(latest.status))}>{statusLabels[text(latest.status)] ?? text(latest.status)}</StatusPill> : null}
      </div>

      <p className="whitespace-pre-wrap text-sm text-muted">{text(delivery.instructions)}</p>
      <div className="grid grid-cols-2 gap-3 text-xs"><span className="rounded-lg bg-surface-muted p-2">{attempts}</span><span className="rounded-lg bg-surface-muted p-2">Correção: {text(delivery.grading_mode)}</span></div>
      {latest ? <LatestReview submission={latest} /> : null}

      <details className="rounded-xl border border-border" open={!latest}>
        <summary className="cursor-pointer p-4 font-bold text-secondary">{latest ? "Enviar nova tentativa" : "Fazer entrega"}</summary>
        <form action="/api/delivery-uploads" method="post" encType="multipart/form-data" className="grid gap-4 border-t border-border p-4">
          <input type="hidden" name="delivery_configuration_id" value={text(delivery.id)} />
          <input type="hidden" name="return_to" value="/empreendedor/perfil/entregas#materiais-enviados" />
          {allowed.includes("text") ? <Label>Resposta em texto<Textarea name="text_content" rows={8} placeholder="Escreva sua resposta..." /></Label> : null}
          {allowed.includes("external_link") ? <Label>Link externo<Input name="external_link" type="url" placeholder="https://..." /></Label> : null}
          {allowed.some((format) => !["text", "external_link"].includes(format)) ? <FileUploadPreview name="files" label="Arquivos" accept={acceptedFileTypes(allowed)} multiple maxFiles={Math.max(1, number(delivery.max_files) || 5)} maxSizeBytes={Math.max(1, number(delivery.max_file_size_bytes))} help={`Tipos configurados: ${allowed.filter((format) => !["text", "external_link"].includes(format)).join(", ")}.`} /> : null}
          <button type="submit" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"><FileCheck2 size={17} />Enviar material</button>
        </form>
      </details>

      {submissions.length ? (
        <details className="rounded-xl bg-surface-muted">
          <summary className="cursor-pointer p-3 text-sm font-semibold text-secondary">Histórico de {submissions.length} tentativa(s)</summary>
          <div className="grid gap-2 border-t border-border p-3">
            {submissions.map((submission) => <div key={text(submission.id)} className="rounded-lg bg-white p-3 text-sm"><div className="flex justify-between gap-3"><span>Tentativa {number(submission.attempt_number)}</span><StatusPill tone={statusTone(text(submission.status))}>{statusLabels[text(submission.status)] ?? text(submission.status)}</StatusPill></div>{submission.final_score !== null ? <p className="mt-2 font-bold text-secondary">Nota: {number(submission.final_score).toFixed(1)}</p> : null}{text(submission.final_feedback) ? <p className="mt-1 text-muted">{text(submission.final_feedback)}</p> : null}</div>)}
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function LatestReview({ submission }: { submission: JsonRecord }) {
  const reviews = records(submission.reviews);
  const ai = reviews.find((review) => review.review_type === "ai");
  return <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4"><div className="flex items-center gap-2 text-sm font-bold text-secondary"><Sparkles size={16} className="text-primary" />Retorno da correção</div>{submission.final_score !== null ? <p className="mt-2 text-2xl font-black text-secondary">{number(submission.final_score).toFixed(1)} / 100</p> : null}<p className="mt-2 text-sm text-muted">{text(submission.final_feedback) || text(ai?.feedback) || "Aguardando análise."}</p>{ai?.confidence !== undefined ? <p className="mt-2 text-xs text-muted">Confiança da IA: {number(ai.confidence).toFixed(2)}. Resultados de baixa confiança são enviados à revisão humana.</p> : null}</div>;
}
