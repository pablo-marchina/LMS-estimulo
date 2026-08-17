import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Check, CheckCircle2, Download, Star, UploadCloud } from "lucide-react";
import { rateActivityUtilityAction } from "@/app/actions/journey";
import { completeParticipantActivityAction } from "@/app/empreendedor/atividade/[stepInstanceId]/completion-action";
import { ActivityCommentPanel } from "@/components/activity-comment-panel";
import { ActivityPromptLibrary } from "@/components/activity-prompt-library";
import { ContentAssetViewer } from "@/components/content-asset-viewer";
import { FileUploadPreview } from "@/components/file-upload-preview";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { QuickCheckPanel } from "@/components/quick-check-panel";
import { StatusPanel } from "@/components/status-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";
import { utilityRatingRuntime } from "@/lib/utility-rating/runtime";

export type ParticipantActivityQuery = {
  comentario?: string;
  pratica?: string;
  codigo?: string;
  avaliacao?: string;
  utilidade?: string;
  conclusao?: string;
};

type ParticipantActivityWorkspaceProps = {
  actorUserAccountId: string;
  journeyInstanceId: string;
  stepInstanceId: string;
  query?: ParticipantActivityQuery;
  embedded?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const practiceStatus: Record<string, string> = {
  upload_pending: "Aguardando envio",
  awaiting_review: "Aguardando revisão",
  available: "Disponível",
  accepted: "Aceita",
  rejected: "Revisão solicitada",
  failed: "Falha no envio",
};

const practiceErrors: Record<string, string> = {
  PRACTICE_FILE_REQUIRED: "Selecione um arquivo para enviar.",
  PRACTICE_CONTENT_TYPE_NOT_ALLOWED: "Esse tipo de arquivo não é permitido.",
  PRACTICE_FILE_EXTENSION_NOT_ALLOWED: "A extensão do arquivo não corresponde ao formato permitido.",
  PRACTICE_FILE_SIZE_INVALID: "O arquivo deve ter até 6 MB.",
  PRACTICE_SUBMISSION_LIMIT_REACHED: "O limite de envios desta atividade foi atingido.",
  PRACTICE_STORAGE_UPLOAD_FAILED: "Não foi possível armazenar o arquivo.",
  PRACTICE_UPLOAD_FAILED: "Não foi possível concluir o envio. Tente novamente.",
};

const completionMessages: Record<string, { tone: "success" | "warning" | "danger"; title: string; text: string }> = {
  ok: {
    tone: "success",
    title: "Aula concluída",
    text: "Seu progresso e os pontos correspondentes já estão sendo atualizados.",
  },
  conteudo_pendente: {
    tone: "warning",
    title: "Conteúdo pendente",
    text: "Conclua os materiais obrigatórios antes de finalizar a aula.",
  },
  avaliacao_pendente: {
    tone: "warning",
    title: "Verificação pendente",
    text: "Faça e aprove a verificação desta aula antes de concluir.",
  },
  pratica_pendente: {
    tone: "warning",
    title: "Prática pendente",
    text: "Esta aula possui uma prática com revisão. A conclusão acontece depois do fluxo de envio e revisão.",
  },
  falha: {
    tone: "danger",
    title: "Não foi possível concluir",
    text: "Recarregue a página e tente novamente.",
  },
};

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">{eyebrow}</p> : null}
      <h2 className={`${eyebrow ? "mt-1" : ""} text-xl font-black leading-tight text-secondary`}>{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

export async function ParticipantActivityWorkspace({
  actorUserAccountId,
  journeyInstanceId,
  stepInstanceId,
  query = {},
  embedded = false,
}: ParticipantActivityWorkspaceProps) {
  const [experience, commentResult, practiceLoad, utilityRating] = await Promise.all([
    journeyRuntime.getParticipantExperience(actorUserAccountId, journeyInstanceId),
    journeyRuntime.listActivityComments(actorUserAccountId, stepInstanceId),
    practiceRuntime.listParticipant(actorUserAccountId, stepInstanceId)
      .then((value) => ({ value, unavailable: false as const }))
      .catch(() => ({ value: null, unavailable: true as const })),
    utilityRatingRuntime.get(actorUserAccountId, stepInstanceId),
  ]);

  if (experience.state.s?.step_instance_id !== stepInstanceId || !experience.activity) notFound();

  const activity = experience.activity;
  const assessment = experience.assessment;
  const requiredAssets = activity.assets
    .filter((asset) => asset.is_required)
    .map((asset) => ({ id: asset.id, completed: asset.progress.completed }));
  const maxAttempts = assessment?.max_attempts ?? null;
  const attemptsUsed = experience.state.q?.attempt_number ?? 0;
  const attemptInProgress = experience.state.q?.status === "in_progress";
  const attemptAvailable = maxAttempts === null || attemptInProgress || attemptsUsed < maxAttempts;
  const practiceResult = practiceLoad.value;
  const practiceUnavailable = practiceLoad.unavailable;
  const practice = practiceResult?.practice ?? null;
  const submissions = practiceResult?.submissions ?? [];
  const countedSubmissions = submissions.filter((item) => item.status !== "failed").length;
  const canUpload = practice !== null && (practice.max_submissions === null || countedSubmissions < practice.max_submissions);
  const practiceError = query.codigo ? practiceErrors[query.codigo] ?? practiceErrors.PRACTICE_UPLOAD_FAILED : null;
  const hasAssessment = Boolean(assessment?.questions.length);
  const completed = experience.state.s?.status === "completed";
  const completionMessage = query.conclusao ? completionMessages[query.conclusao] : null;
  const completionTarget = query.conclusao ?? null;

  return (
    <div
      className={embedded
        ? "w-full min-w-0 pb-8 pt-1"
        : "mx-auto w-full max-w-[1100px] px-4 pb-20 pt-4 sm:px-6 sm:pt-6"}
      data-participant-activity-workspace
      data-embedded={embedded ? "true" : "false"}
    >
      <JourneyProgressNav
        state={experience.state}
        current="activity"
        activityTitle={activity.title}
        estimatedMinutes={activity.estimated_minutes}
        headingLevel={embedded ? "h2" : "h1"}
      />

      <main className="mt-5 min-w-0 overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-sm" data-unified-shell>
        <section id="conteudo" className="scroll-mt-24 min-w-0" aria-labelledby="conteudo-titulo">
          <div className="border-b border-border bg-surface-muted/55 px-4 py-5 sm:px-6 sm:py-6">
            <SectionTitle
              eyebrow="Conteúdo"
              title="Estude esta aula no seu ritmo"
              description={activity.description ?? "Acompanhe os materiais abaixo. Seu progresso fica vinculado a esta aula."}
            />
          </div>

          <div className="grid min-w-0 gap-4 p-4 sm:p-6">
            {completionTarget === "conteudo_pendente" && completionMessage ? (
              <StatusPanel title={completionMessage.title} tone={completionMessage.tone}>{completionMessage.text}</StatusPanel>
            ) : null}

            {activity.assets.length ? (
              activity.assets.map((asset) => (
                <ContentAssetViewer
                  key={asset.id}
                  asset={asset}
                  compact
                  progressEndpoint={`/api/activity-assets/progress?step=${encodeURIComponent(stepInstanceId)}`}
                  downloadHref={asset.file_object_id ? `/api/activity-assets/${asset.id}/download?step=${encodeURIComponent(stepInstanceId)}` : null}
                />
              ))
            ) : (
              <StatusPanel title="Nenhum material anexado" tone="info">
                Continue pelas etapas disponíveis nesta aula.
              </StatusPanel>
            )}
          </div>
        </section>

        {activity.prompts.length ? <ActivityPromptLibrary prompts={activity.prompts} /> : null}

        {hasAssessment ? (
          <section id="avaliacao" className="scroll-mt-24 grid min-w-0 gap-5 border-t border-border px-4 py-6 sm:px-6 sm:py-7" aria-labelledby="avaliacao-titulo">
            <div id="avaliacao-titulo">
              <SectionTitle
                eyebrow="Verificação"
                title="Verifique o que aprendeu"
                description="Responda depois de concluir os materiais obrigatórios. Suas respostas e tentativas ficam vinculadas a esta aula."
              />
            </div>
            {completionTarget === "avaliacao_pendente" && completionMessage ? (
              <StatusPanel title={completionMessage.title} tone={completionMessage.tone}>{completionMessage.text}</StatusPanel>
            ) : null}
            {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? (
              <StatusPanel title="Revise e tente novamente" tone="warning">
                A tentativa anterior não atingiu o critério. Reveja o conteúdo e faça uma nova tentativa.
              </StatusPanel>
            ) : null}
            <QuickCheckPanel
              journeyInstanceId={journeyInstanceId}
              stepInstanceId={stepInstanceId}
              idempotencyKey={randomUUID()}
              questions={assessment?.questions ?? []}
              passingScore={assessment?.passing_score ?? null}
              maxAttempts={maxAttempts}
              attemptsUsed={attemptsUsed}
              attemptAvailable={attemptAvailable}
              passed={Boolean(experience.state.q?.passed)}
              requiredAssets={requiredAssets}
              sectionsComplete
            />
          </section>
        ) : null}

        {practiceUnavailable ? (
          <div className="border-t border-border px-4 py-5 sm:px-6">
            <StatusPanel title="Atividade prática temporariamente indisponível" tone="warning">
              Não foi possível consultar a configuração e os envios desta prática. Recarregue a página antes de concluir que esta aula não possui entrega obrigatória.
            </StatusPanel>
          </div>
        ) : null}

        {practice ? (
          <section id="pratica" className="scroll-mt-24 grid min-w-0 gap-5 border-t border-border px-4 py-6 sm:px-6 sm:py-7" aria-labelledby="pratica-titulo">
            <div id="pratica-titulo">
              <SectionTitle
                eyebrow="Prática"
                title="Aplique e envie sua evidência"
                description="Envie PDF, imagem, TXT ou DOCX de até 6 MB. O arquivo permanece privado e nunca é executado."
              />
            </div>

            {completionTarget === "pratica_pendente" && completionMessage ? (
              <StatusPanel title={completionMessage.title} tone={completionMessage.tone}>{completionMessage.text}</StatusPanel>
            ) : null}
            {query.pratica === "enviada" ? <StatusPanel title="Arquivo recebido" tone="success">A evidência foi registrada para revisão.</StatusPanel> : null}
            {query.pratica === "erro" ? <StatusPanel title="Envio não concluído" tone="warning">{practiceError}</StatusPanel> : null}

            {canUpload ? (
              <form action="/api/practice-uploads" method="post" encType="multipart/form-data" className="grid min-w-0 gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
                <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <div className="grid min-w-0 gap-3">
                  <FileUploadPreview
                    name="file"
                    label="Arquivo da prática"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
                    required
                    maxSizeBytes={6 * 1024 * 1024}
                    help="PDF, imagem, TXT ou DOCX. O arquivo permanece privado e nunca é executado."
                  />
                  <label className="flex items-start gap-2 text-xs leading-5 text-ink">
                    <input type="checkbox" name="allow_public_use" className="mt-0.5 size-4 shrink-0 accent-primary" />
                    <span>Autorizo o Estímulo a avaliar este material para possíveis estudos de caso. A autorização é opcional.</span>
                  </label>
                  {practice.terms_version ? <p className="text-xs text-muted">Termos aplicáveis: {practice.terms_version}.</p> : null}
                </div>
                <Button type="submit" icon={<UploadCloud size={15} />}>Enviar evidência</Button>
              </form>
            ) : (
              <StatusPanel title="Limite de envios atingido" tone="info">Esta atividade não aceita novos arquivos no momento.</StatusPanel>
            )}

            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-ink">Histórico de envios</h3>
                <span className="text-xs font-semibold text-muted">{countedSubmissions} {countedSubmissions === 1 ? "envio válido" : "envios válidos"}</span>
              </div>
              {submissions.length ? (
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="grid min-w-0 gap-3 p-4 after:!hidden">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <strong className="text-sm text-ink">Envio {submission.submission_number}</strong>
                        <StatusPill tone={submission.status === "accepted" ? "success" : submission.status === "rejected" ? "danger" : "neutral"}>
                          {practiceStatus[submission.status] ?? submission.status}
                        </StatusPill>
                        <time dateTime={submission.submitted_at} className="ml-auto text-[11px] text-muted">{dateFormatter.format(new Date(submission.submitted_at))}</time>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{submission.original_filename ?? "Arquivo em preparação"}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                          <span>{submission.content_type ?? "Formato em validação"}</span>
                          {fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}
                        </div>
                      </div>
                      {submission.review_feedback ? <p className="rounded-xl bg-warning-soft p-3 text-xs leading-5 text-warning"><strong>Retorno da revisão:</strong> {submission.review_feedback}</p> : null}
                      {submission.can_download ? (
                        <Link href={`/api/practice-submissions/${submission.id}/download`} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          <Download size={13} /> Baixar arquivo
                        </Link>
                      ) : null}
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nenhuma evidência enviada" tone="info">Seu histórico aparecerá aqui após o primeiro envio.</EmptyState>
              )}
            </div>
          </section>
        ) : null}

        <section className="grid min-w-0 gap-5 border-t border-border bg-surface-muted/45 px-4 py-6 sm:px-6 sm:py-7" aria-label="Conclusão e avaliação da aula">
          {(completionTarget === "ok" || completionTarget === "falha") && completionMessage ? (
            <StatusPanel title={completionMessage.title} tone={completionMessage.tone}>{completionMessage.text}</StatusPanel>
          ) : null}

          <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] md:items-start">
            <div className="min-w-0">
              <SectionTitle
                eyebrow="Finalização"
                title={completed ? "Aula concluída" : "Finalize quando terminar as etapas"}
                description={completed ? "Seu progresso nesta aula já foi registrado." : "Conclua os requisitos da aula e registre seu progresso quando estiver pronto."}
              />
              <form action={completeParticipantActivityAction} id="concluir-aula" className="mt-4">
                <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
                <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <PendingSubmitButton
                  pendingLabel="Concluindo aula…"
                  type="submit"
                  disabled={completed}
                  className={completed ? "!bg-success-soft !text-success !shadow-none" : ""}
                >
                  <Check size={17} aria-hidden="true" /> {completed ? "Aula concluída" : "Marcar como concluída"}
                </PendingSubmitButton>
              </form>
            </div>

            <div id="utilidade" className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-ink">
                {query.utilidade === "registrada" || utilityRating.rating ? "Obrigado pela avaliação!" : "O que achou desta aula?"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">Sua nota ajuda a melhorar o conteúdo e não interfere na conclusão.</p>
              <form action={rateActivityUtilityAction} className="mt-3 flex items-center gap-1" aria-label="Avalie esta aula de 1 a 5 estrelas">
                <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
                <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                {[1, 2, 3, 4, 5].map((rating) => {
                  const active = rating <= (utilityRating.rating ?? 0);
                  return (
                    <button
                      key={rating}
                      type="submit"
                      name="rating"
                      value={rating}
                      aria-label={`Avaliar com ${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
                      title={`${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
                      className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-primary-soft hover:text-primary focus-visible:text-primary"
                    >
                      <Star size={20} fill={active ? "currentColor" : "none"} className={active ? "text-primary" : ""} />
                    </button>
                  );
                })}
              </form>
              {query.utilidade === "registrada" ? (
                <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-success"><CheckCircle2 size={14} /> Avaliação registrada</p>
              ) : null}
            </div>
          </div>
        </section>

        <section id="comentarios" className="scroll-mt-24 min-w-0 border-t border-border px-4 py-6 sm:px-6 sm:py-7" aria-labelledby="comentarios-titulo">
          <div id="comentarios-titulo">
            <SectionTitle
              eyebrow="Discussão"
              title="Converse sobre esta aula"
              description="Conte o que você achou ou compartilhe como isso se aplica ao seu negócio. Não publique dados pessoais, financeiros ou sensíveis."
            />
          </div>
          <div className="mt-5 max-w-3xl">
            <ActivityCommentPanel
              journeyInstanceId={journeyInstanceId}
              stepInstanceId={stepInstanceId}
              initialComments={commentResult.comments}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
