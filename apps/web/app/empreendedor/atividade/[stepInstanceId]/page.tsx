import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { Download, Star } from "lucide-react";
import { acknowledgeActivityAction, createActivityCommentAction, rateActivityUtilityAction, submitQuickCheckAction } from "@/app/actions/journey";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { StatusPanel } from "@/components/status-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";
import { utilityRatingRuntime } from "@/lib/utility-rating/runtime";

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo"
});

const practiceStatus: Record<string, string> = {
  upload_pending: "Aguardando envio",
  awaiting_review: "Aguardando revisão",
  available: "Disponível",
  accepted: "Aceita",
  rejected: "Revisão solicitada",
  failed: "Falha no envio"
};

const practiceErrors: Record<string, string> = {
  PRACTICE_FILE_REQUIRED: "Selecione um arquivo para enviar.",
  PRACTICE_CONTENT_TYPE_NOT_ALLOWED: "Esse tipo de arquivo não é permitido.",
  PRACTICE_FILE_EXTENSION_NOT_ALLOWED: "A extensão do arquivo não corresponde ao formato permitido.",
  PRACTICE_FILE_SIZE_INVALID: "O arquivo deve ter até 6 MB.",
  PRACTICE_SUBMISSION_LIMIT_REACHED: "O limite de envios desta atividade foi atingido.",
  PRACTICE_STORAGE_UPLOAD_FAILED: "Não foi possível armazenar o arquivo.",
  PRACTICE_UPLOAD_FAILED: "Não foi possível concluir o envio. Tente novamente."
};

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ActivityPage({
  params,
  searchParams
}: {
  params: Promise<{ stepInstanceId: string }>;
  searchParams: Promise<{ journey?: string; comentario?: string; pratica?: string; codigo?: string; avaliacao?: string; utilidade?: string }>;
}) {
  const [{ stepInstanceId }, query] = await Promise.all([params, searchParams]);
  const journey = query.journey;
  if (!journey) notFound();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [experience, commentResult, practiceResult, utilityRating] = await Promise.all([
    journeyRuntime.getParticipantExperience(auth.identity.user_account_id, journey),
    journeyRuntime.listActivityComments(auth.identity.user_account_id, stepInstanceId),
    practiceRuntime.listParticipant(auth.identity.user_account_id, stepInstanceId).catch(() => null),
    utilityRatingRuntime.get(auth.identity.user_account_id, stepInstanceId)
  ]);
  if (experience.state.s?.step_instance_id !== stepInstanceId || !experience.activity) notFound();

  const accepted = experience.state.s.accepted_sections;
  const sectionTotal = experience.activity.sections.length;
  const canAssess = sectionTotal > 0 && accepted >= sectionTotal;
  const assessment = experience.assessment;
  const maxAttempts = assessment?.max_attempts ?? null;
  const attemptsUsed = experience.state.q?.attempt_number ?? 0;
  const attemptInProgress = experience.state.q?.status === "in_progress";
  const attemptAvailable = maxAttempts === null || attemptInProgress || attemptsUsed < maxAttempts;
  const practice = practiceResult?.practice ?? null;
  const submissions = practiceResult?.submissions ?? [];
  const countedSubmissions = submissions.filter((item) => item.status !== "failed").length;
  const canUpload = practice !== null && (practice.max_submissions === null || countedSubmissions < practice.max_submissions);
  const practiceError = query.codigo ? practiceErrors[query.codigo] ?? practiceErrors.PRACTICE_UPLOAD_FAILED : null;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atividade"
        title={experience.activity.title}
        description={
          <>
            {experience.activity.description}
            <br />
            <span className="text-sm">Tempo estimado: {experience.activity.estimated_minutes} minutos</span>
          </>
        }
      />
      <JourneyProgressNav state={experience.state} current="activity" />
      <Progress value={sectionTotal ? (accepted / sectionTotal) * 100 : 0} label="Conteúdo confirmado" />

      <form action={acknowledgeActivityAction} className="grid gap-4" id="conteudo">
        <input type="hidden" name="journey_instance_id" value={journey} />
        <input type="hidden" name="step_instance_id" value={stepInstanceId} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        {experience.activity.sections.map((section, index) => (
          <Card key={section.code}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Parte {index + 1}</p>
            <h2 className="text-lg font-semibold text-ink">{text(section.heading) ?? text(section.title) ?? section.code}</h2>
            {text(section.body) ? <p className="mt-2 text-sm text-ink/90">{text(section.body)}</p> : null}
            <label className="mt-4 flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" name={`section_${section.code}`} className="mt-0.5 size-4 accent-primary" />
              <span>Li e compreendi esta parte</span>
            </label>
          </Card>
        ))}
        {accepted < sectionTotal ? <Button type="submit" className="w-fit">Registrar leitura</Button> : null}
      </form>

      {practice ? (
        <section className="grid gap-4" id="pratica" aria-labelledby="pratica-titulo">
          <div>
            <h2 id="pratica-titulo" className="text-xl font-semibold text-ink">Envie sua evidência</h2>
            <p className="text-sm text-muted">Formatos aceitos: PDF, imagem, TXT ou DOCX. Limite de 6 MB. O arquivo permanece privado e é validado por formato, tamanho, hash e autorização de acesso.</p>
          </div>
          {query.pratica === "enviada" ? <StatusPanel title="Arquivo recebido" tone="success">A evidência foi registrada e já está disponível para a etapa de revisão aplicável.</StatusPanel> : null}
          {query.pratica === "erro" ? <StatusPanel title="Envio não concluído" tone="warning">{practiceError}</StatusPanel> : null}
          {canUpload ? (
            <Card className="grid gap-4">
              <form action="/api/practice-uploads" method="post" encType="multipart/form-data" className="grid gap-4">
                <input type="hidden" name="journey_instance_id" value={journey} />
                <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <label htmlFor="practice-file" className="grid gap-1.5 text-sm font-medium text-ink">
                  Arquivo da prática
                  <input
                    id="practice-file"
                    name="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
                    required
                    className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-primary"
                  />
                </label>
                <label className="flex items-start gap-2.5 text-sm text-ink">
                  <input type="checkbox" name="allow_public_use" className="mt-0.5 size-4 accent-primary" />
                  <span>Autorizo o Estímulo a avaliar este material para possíveis estudos de caso e evidências de impacto. A autorização é opcional e não altera a conclusão da atividade.</span>
                </label>
                {practice.terms_version ? <p className="text-xs text-muted">Termos aplicáveis: {practice.terms_version}.</p> : null}
                <Button type="submit" className="w-fit">Enviar evidência</Button>
              </form>
            </Card>
          ) : (
            <StatusPanel title="Limite de envios atingido" tone="info">Esta atividade não aceita novos arquivos no momento.</StatusPanel>
          )}
          {submissions.length === 0 ? (
            <EmptyState title="Nenhuma evidência enviada" tone="info">Seu histórico de envios aparecerá aqui.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <strong className="text-ink">Envio {submission.submission_number}</strong>
                    <StatusPill tone={submission.status === "accepted" ? "success" : submission.status === "rejected" ? "danger" : "neutral"}>
                      {practiceStatus[submission.status] ?? submission.status}
                    </StatusPill>
                    <time dateTime={submission.submitted_at} className="ml-auto text-xs text-muted">
                      {dateFormatter.format(new Date(submission.submitted_at))}
                    </time>
                  </div>
                  <p className="text-sm text-ink">{submission.original_filename ?? "Arquivo em preparação"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{submission.content_type ?? "Formato em validação"}</span>
                    {fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}
                    <span>{submission.allow_public_use ? "Uso autorizado" : "Uso público não autorizado"}</span>
                  </div>
                  {submission.review_feedback ? (
                    <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                      <strong>Retorno da revisão:</strong> {submission.review_feedback}
                    </p>
                  ) : null}
                  {submission.can_download ? (
                    <Link href={`/api/practice-submissions/${submission.id}/download`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                      <Download size={14} /> Baixar arquivo
                    </Link>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {canAssess ? (
        <Card id="utilidade" aria-labelledby="utilidade-titulo" className="grid gap-4">
          <div>
            <h2 id="utilidade-titulo" className="text-lg font-semibold text-ink">Esta atividade foi útil?</h2>
            <p className="text-sm text-muted">A nota de 1 a 5 melhora a capacitação. Ela não altera sua conclusão, seus pontos ou qualquer decisão de crédito.</p>
          </div>
          {query.utilidade === "registrada" ? <StatusPanel title="Avaliação registrada" tone="success">Obrigado. A revisão anterior permanece no histórico e esta é a nota atual.</StatusPanel> : null}
          <form action={rateActivityUtilityAction} className="grid gap-3">
            <input type="hidden" name="journey_instance_id" value={journey} />
            <input type="hidden" name="step_instance_id" value={stepInstanceId} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Escolha de 1 a 5 estrelas</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <label
                    key={rating}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary"
                  >
                    <input type="radio" name="rating" value={rating} defaultChecked={utilityRating.rating === rating} required className="sr-only" />
                    <Star size={14} aria-hidden="true" />
                    {rating}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button variant="secondary" type="submit" className="w-fit">
              {utilityRating.rating ? "Atualizar avaliação" : "Enviar avaliação"}
            </Button>
            {utilityRating.rating ? <p className="text-xs text-muted">Nota atual: {utilityRating.rating}/5 · revisão {utilityRating.revision}.</p> : null}
          </form>
        </Card>
      ) : null}

      <section className="grid gap-4" id="comentarios" aria-labelledby="comentarios-titulo">
        <div>
          <h2 id="comentarios-titulo" className="text-xl font-semibold text-ink">Comentários da aula</h2>
          <p className="text-sm text-muted">Compartilhe sua experiência com a atividade. Não publique dados pessoais, senhas ou informações financeiras.</p>
        </div>
        {query.comentario === "criado" ? <StatusPanel title="Comentário publicado" tone="success">Sua participação já está visível nesta aula.</StatusPanel> : null}
        <Card className="grid gap-3">
          <form action={createActivityCommentAction} className="grid gap-3">
            <input type="hidden" name="journey_instance_id" value={journey} />
            <input type="hidden" name="step_instance_id" value={stepInstanceId} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <label htmlFor="activity-comment" className="text-sm font-medium text-ink">Escreva seu comentário</label>
            <Textarea
              id="activity-comment"
              name="body"
              minLength={1}
              maxLength={2000}
              rows={4}
              required
              placeholder="Conte como você usa o ChatGPT no dia a dia ou responda à pergunta proposta na aula."
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted">Máximo de 2.000 caracteres.</span>
              <Button type="submit" size="sm">Publicar comentário</Button>
            </div>
          </form>
        </Card>
        {commentResult.comments.length === 0 ? (
          <EmptyState title="Nenhum comentário ainda" tone="info">Seja a primeira pessoa a participar desta aula.</EmptyState>
        ) : (
          <div className="grid gap-3" aria-live="polite">
            {commentResult.comments.map((comment) => (
              <Card key={comment.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <strong className="text-ink">{comment.author_name}</strong>
                  {comment.is_own ? <StatusPill tone="info">Você</StatusPill> : null}
                  <time dateTime={comment.created_at} className="ml-auto text-xs text-muted">
                    {dateFormatter.format(new Date(comment.created_at))}
                  </time>
                </div>
                <p className="text-sm text-ink">{comment.body}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? (
        <StatusPanel title="Revise e tente novamente" tone="warning">A tentativa anterior não atingiu o critério da atividade. O resultado é pedagógico e não representa risco ou elegibilidade de crédito.</StatusPanel>
      ) : null}
      {experience.state.q?.passed ? (
        <StatusPanel title="Atividade concluída" tone="success">O resultado, os pontos e as credenciais elegíveis foram processados.</StatusPanel>
      ) : null}
      {canAssess && assessment && !experience.state.q?.passed && !attemptAvailable ? (
        <StatusPanel title="Limite de tentativas atingido" tone="warning">Não há uma nova tentativa disponível para esta versão da avaliação.</StatusPanel>
      ) : null}

      {canAssess && assessment?.questions.length && !experience.state.q?.passed && attemptAvailable ? (
        <form action={submitQuickCheckAction} className="grid gap-4" id="avaliacao">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <Card>
            <h2 className="text-lg font-semibold text-ink">Verifique o que aprendeu</h2>
            <p className="mt-1 text-sm text-muted">
              {assessment.questions.length} {assessment.questions.length === 1 ? "questão" : "questões"}
              {assessment.passing_score !== null ? ` · aprovação a partir de ${assessment.passing_score}%` : ""}
              {maxAttempts !== null ? ` · até ${maxAttempts} tentativas` : ""}.
            </p>
          </Card>
          {assessment.questions.map((question, index) => (
            <Card key={question.id} className="grid gap-3">
              <legend className="text-sm font-semibold text-ink">
                <span className="mr-2 text-primary">Questão {index + 1}</span>
                {question.prompt}
              </legend>
              {question.response ? (
                <>
                  <input type="hidden" name={`answer_${question.id}`} value={question.response.option_code} />
                  <p className="text-sm text-muted">Resposta registrada nesta tentativa.</p>
                </>
              ) : (
                <div className="grid gap-2">
                  {question.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium has-checked:border-primary has-checked:bg-primary-soft"
                    >
                      <input type="radio" name={`answer_${question.id}`} value={option.code} required className="size-4 accent-primary" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          ))}
          <Button type="submit" className="w-fit">Enviar avaliação</Button>
        </form>
      ) : null}

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <ButtonLink href="/empreendedor" variant="secondary">Voltar ao painel</ButtonLink>
        {experience.state.q?.passed ? (
          <ButtonLink href={`/empreendedor/resultado?journey=${journey}`}>Ver resultado</ButtonLink>
        ) : canAssess && assessment?.questions.length ? (
          <ButtonLink href="#avaliacao">Ir para avaliação</ButtonLink>
        ) : (
          <ButtonLink href="#conteudo" variant="secondary">Voltar ao conteúdo</ButtonLink>
        )}
      </div>
    </div>
  );
}
