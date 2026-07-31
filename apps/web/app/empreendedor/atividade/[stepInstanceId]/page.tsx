import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Download,
  MessageCircle,
  Star,
  UploadCloud,
} from "lucide-react";
import { createActivityCommentAction, rateActivityUtilityAction } from "@/app/actions/journey";
import { ActivityContentProgress } from "@/components/activity-content-progress";
import { ContentAssetViewer } from "@/components/content-asset-viewer";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { QuickCheckPanel } from "@/components/quick-check-panel";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { practiceRuntime } from "@/lib/practice/runtime";
import { utilityRatingRuntime } from "@/lib/utility-rating/runtime";

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

function fileSize(value: number | null): string | null {
  if (value === null) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border bg-surface-muted/65 px-4 py-4 sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">{eyebrow}</p>
        <h2 className="mt-0.5 text-lg font-black text-secondary sm:text-xl">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

function LessonIndexLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-primary-soft hover:text-primary"
    >
      <span className="text-muted transition group-hover:text-primary">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight size={14} className="text-muted/60 transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ stepInstanceId: string }>;
  searchParams: Promise<{
    journey?: string;
    comentario?: string;
    pratica?: string;
    codigo?: string;
    avaliacao?: string;
    utilidade?: string;
  }>;
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
    utilityRatingRuntime.get(auth.identity.user_account_id, stepInstanceId),
  ]);

  if (experience.state.s?.step_instance_id !== stepInstanceId || !experience.activity) notFound();

  const activity = experience.activity;
  const assessment = experience.assessment;
  const requiredAssets = activity.assets
    .filter((asset) => asset.is_required)
    .map((asset) => ({ id: asset.id, completed: asset.progress.completed }));
  const requiredAssetCount = requiredAssets.length;
  const maxAttempts = assessment?.max_attempts ?? null;
  const attemptsUsed = experience.state.q?.attempt_number ?? 0;
  const attemptInProgress = experience.state.q?.status === "in_progress";
  const attemptAvailable = maxAttempts === null || attemptInProgress || attemptsUsed < maxAttempts;
  const practice = practiceResult?.practice ?? null;
  const submissions = practiceResult?.submissions ?? [];
  const countedSubmissions = submissions.filter((item) => item.status !== "failed").length;
  const canUpload = practice !== null && (practice.max_submissions === null || countedSubmissions < practice.max_submissions);
  const practiceError = query.codigo ? practiceErrors[query.codigo] ?? practiceErrors.PRACTICE_UPLOAD_FAILED : null;
  const hasAssessment = Boolean(assessment?.questions.length);

  return (
    <div className="mx-auto grid w-full max-w-[1480px] gap-5 px-4 py-5 sm:px-5 lg:px-7 lg:py-7">
      <JourneyProgressNav
        state={experience.state}
        current="activity"
        activityTitle={activity.title}
        estimatedMinutes={activity.estimated_minutes}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="grid min-w-0 gap-5">
          <section
            id="conteudo"
            aria-labelledby="conteudo-titulo"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <SectionHeading
              icon={<BookOpen size={19} />}
              eyebrow="Conteúdo da aula"
              title="Aprenda no seu ritmo"
              description={
                activity.assets.length
                  ? `${activity.assets.length} ${activity.assets.length === 1 ? "material" : "materiais"}${requiredAssetCount ? ` · ${requiredAssetCount} obrigatório${requiredAssetCount === 1 ? "" : "s"}` : ""}. O progresso é salvo automaticamente.`
                  : "Esta aula não possui mídia. Continue pela verificação ou pela atividade prática disponível."
              }
            />

            <div className="grid gap-4 p-3 sm:p-4">
              {activity.assets.length ? (
                activity.assets.map((asset) => (
                  <ContentAssetViewer
                    key={asset.id}
                    asset={asset}
                    compact
                    progressEndpoint={`/api/activity-assets/progress?step=${encodeURIComponent(stepInstanceId)}`}
                    downloadHref={
                      asset.file_object_id
                        ? `/api/activity-assets/${asset.id}/download?step=${encodeURIComponent(stepInstanceId)}`
                        : null
                    }
                  />
                ))
              ) : (
                <StatusPanel title="Nenhum material anexado" tone="info">
                  Use as próximas etapas da aula para registrar seu aprendizado.
                </StatusPanel>
              )}
            </div>
          </section>

          {hasAssessment ? (
            <section id="avaliacao" aria-labelledby="avaliacao-titulo" className="scroll-mt-24 grid gap-4">
              <div className="rounded-2xl border border-border bg-white shadow-sm">
                <SectionHeading
                  icon={<Brain size={19} />}
                  eyebrow="Etapa 2"
                  title="Verifique o que aprendeu"
                  description="Responda depois de concluir os materiais obrigatórios. Suas respostas e tentativas ficam vinculadas a esta aula."
                />
              </div>

              {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? (
                <StatusPanel title="Revise e tente novamente" tone="warning">
                  A tentativa anterior não atingiu o critério. Reveja o conteúdo e faça uma nova tentativa.
                </StatusPanel>
              ) : null}

              <QuickCheckPanel
                journeyInstanceId={journey}
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

          {practice ? (
            <section
              id="pratica"
              aria-labelledby="pratica-titulo"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
            >
              <SectionHeading
                icon={<UploadCloud size={19} />}
                eyebrow={hasAssessment ? "Etapa 3" : "Etapa 2"}
                title="Aplique e envie sua evidência"
                description="Envie PDF, imagem, TXT ou DOCX de até 6 MB. O arquivo permanece privado e nunca é executado."
              />

              <div className="grid gap-4 p-4 sm:p-5">
                {query.pratica === "enviada" ? (
                  <StatusPanel title="Arquivo recebido" tone="success">
                    A evidência foi registrada para revisão.
                  </StatusPanel>
                ) : null}

                {query.pratica === "erro" ? (
                  <StatusPanel title="Envio não concluído" tone="warning">
                    {practiceError}
                  </StatusPanel>
                ) : null}

                {canUpload ? (
                  <form
                    action="/api/practice-uploads"
                    method="post"
                    encType="multipart/form-data"
                    className="grid gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary-soft/25 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  >
                    <input type="hidden" name="journey_instance_id" value={journey} />
                    <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                    <input type="hidden" name="idempotency_key" value={randomUUID()} />

                    <div className="grid min-w-0 gap-3">
                      <label htmlFor="practice-file" className="grid gap-1.5 text-sm font-semibold text-ink">
                        Arquivo da prática
                        <input
                          id="practice-file"
                          name="file"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx"
                          required
                          className="min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-primary"
                        />
                      </label>

                      <label className="flex items-start gap-2 text-xs leading-5 text-ink">
                        <input type="checkbox" name="allow_public_use" className="mt-0.5 size-4 shrink-0 accent-primary" />
                        <span>
                          Autorizo o Estímulo a avaliar este material para possíveis estudos de caso. A autorização é opcional.
                        </span>
                      </label>

                      {practice.terms_version ? (
                        <p className="text-xs text-muted">Termos aplicáveis: {practice.terms_version}.</p>
                      ) : null}
                    </div>

                    <Button type="submit" icon={<UploadCloud size={15} />}>
                      Enviar evidência
                    </Button>
                  </form>
                ) : (
                  <StatusPanel title="Limite de envios atingido" tone="info">
                    Esta atividade não aceita novos arquivos no momento.
                  </StatusPanel>
                )}

                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-black text-secondary">Histórico de envios</h3>
                    <span className="text-xs font-semibold text-muted">
                      {countedSubmissions} {countedSubmissions === 1 ? "envio válido" : "envios válidos"}
                    </span>
                  </div>

                  {submissions.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {submissions.map((submission) => (
                        <Card key={submission.id} className="grid gap-3 p-4 after:!hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-ink">Envio {submission.submission_number}</strong>
                            <StatusPill
                              tone={
                                submission.status === "accepted"
                                  ? "success"
                                  : submission.status === "rejected"
                                    ? "danger"
                                    : "neutral"
                              }
                            >
                              {practiceStatus[submission.status] ?? submission.status}
                            </StatusPill>
                            <time dateTime={submission.submitted_at} className="ml-auto text-[11px] text-muted">
                              {dateFormatter.format(new Date(submission.submitted_at))}
                            </time>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {submission.original_filename ?? "Arquivo em preparação"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                              <span>{submission.content_type ?? "Formato em validação"}</span>
                              {fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}
                            </div>
                          </div>

                          {submission.review_feedback ? (
                            <p className="rounded-xl bg-warning-soft p-3 text-xs leading-5 text-warning">
                              <strong>Retorno da revisão:</strong> {submission.review_feedback}
                            </p>
                          ) : null}

                          {submission.can_download ? (
                            <Link
                              href={`/api/practice-submissions/${submission.id}/download`}
                              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <Download size={13} /> Baixar arquivo
                            </Link>
                          ) : null}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Nenhuma evidência enviada" tone="info">
                      Seu histórico aparecerá aqui após o primeiro envio.
                    </EmptyState>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section
            id="comentarios"
            aria-labelledby="comentarios-titulo"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <SectionHeading
              icon={<MessageCircle size={19} />}
              eyebrow={practice ? (hasAssessment ? "Etapa 4" : "Etapa 3") : hasAssessment ? "Etapa 3" : "Etapa 2"}
              title="Discuta a aula"
              description="Compartilhe uma aplicação, dúvida ou aprendizado. Não publique dados pessoais, financeiros ou sensíveis."
            />

            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="grid content-start gap-3">
                {query.comentario === "criado" ? (
                  <StatusPanel title="Comentário publicado" tone="success">
                    Sua participação já está visível.
                  </StatusPanel>
                ) : null}

                <form action={createActivityCommentAction} className="grid gap-3 rounded-2xl bg-surface-muted p-4">
                  <input type="hidden" name="journey_instance_id" value={journey} />
                  <input type="hidden" name="step_instance_id" value={stepInstanceId} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <label htmlFor="activity-comment" className="text-sm font-semibold text-ink">
                    Novo comentário
                  </label>
                  <Textarea
                    id="activity-comment"
                    name="body"
                    minLength={1}
                    maxLength={2000}
                    rows={4}
                    required
                    placeholder="Conte o que você testou ou quer entender."
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-muted">Até 2.000 caracteres</span>
                    <Button type="submit" size="sm" icon={<MessageCircle size={14} />}>
                      Publicar
                    </Button>
                  </div>
                </form>
              </div>

              {commentResult.comments.length === 0 ? (
                <EmptyState title="Nenhum comentário ainda" tone="info">
                  Seja a primeira pessoa a participar.
                </EmptyState>
              ) : (
                <div className="grid max-h-[520px] content-start gap-2 overflow-y-auto pr-1" aria-live="polite">
                  {commentResult.comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-border bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-ink">{comment.author_name}</strong>
                        {comment.is_own ? <StatusPill tone="info">Você</StatusPill> : null}
                        <time dateTime={comment.created_at} className="ml-auto text-[11px] text-muted">
                          {dateFormatter.format(new Date(comment.created_at))}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{comment.body}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="no-print grid content-start gap-4 xl:sticky xl:top-20">
          <ActivityContentProgress
            completedSections={0}
            sectionTotal={0}
            assets={activity.assets.map((asset) => ({ id: asset.id, completed: asset.progress.completed }))}
          />

          <nav className="rounded-2xl border border-border bg-white p-2 shadow-sm" aria-label="Índice da aula">
            <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Nesta aula</p>
            <LessonIndexLink href="#conteudo" icon={<BookOpen size={16} />} label="Conteúdo" />
            {hasAssessment ? <LessonIndexLink href="#avaliacao" icon={<Brain size={16} />} label="Verificação" /> : null}
            {practice ? <LessonIndexLink href="#pratica" icon={<UploadCloud size={16} />} label="Entrega prática" /> : null}
            <LessonIndexLink href="#comentarios" icon={<MessageCircle size={16} />} label="Discussão" />
          </nav>

          <Card id="utilidade" aria-labelledby="utilidade-titulo" className="grid gap-3 p-4 after:!hidden">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                <Star size={17} fill="currentColor" />
              </span>
              <div>
                <h2 id="utilidade-titulo" className="text-sm font-black text-secondary">
                  Avalie esta aula
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted">A nota melhora o conteúdo e não interfere na conclusão.</p>
              </div>
            </div>

            {query.utilidade === "registrada" ? (
              <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-xs font-semibold text-success">
                <CheckCircle2 size={14} /> Avaliação registrada
              </div>
            ) : null}

            <form action={rateActivityUtilityAction} className="grid gap-3">
              <input type="hidden" name="journey_instance_id" value={journey} />
              <input type="hidden" name="step_instance_id" value={stepInstanceId} />
              <input type="hidden" name="idempotency_key" value={randomUUID()} />
              <fieldset>
                <legend className="sr-only">Escolha sua nota</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label
                      key={rating}
                      className="grid cursor-pointer place-items-center rounded-xl border border-border bg-white py-2 text-xs font-bold text-muted transition hover:border-primary/40 hover:text-primary has-checked:border-primary has-checked:bg-primary has-checked:text-white"
                      title={`${rating} ${rating === 1 ? "estrela" : "estrelas"}`}
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={rating}
                        defaultChecked={utilityRating.rating === rating}
                        required
                        className="sr-only"
                      />
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> {rating}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button variant="secondary" size="sm" type="submit" className="w-full">
                {utilityRating.rating ? "Atualizar avaliação" : "Enviar avaliação"}
              </Button>
            </form>
          </Card>
        </aside>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <ButtonLink href={`/empreendedor/jornada/${journey}`} variant="secondary">
          Voltar à jornada
        </ButtonLink>
        {experience.state.q?.passed ? (
          <ButtonLink href={`/empreendedor/resultado?journey=${journey}`}>Ver progresso da jornada</ButtonLink>
        ) : hasAssessment ? (
          <ButtonLink href="#avaliacao">Ir para a verificação</ButtonLink>
        ) : practice ? (
          <ButtonLink href="#pratica">Ir para a entrega</ButtonLink>
        ) : (
          <ButtonLink href="#comentarios" variant="secondary">
            Participar da discussão
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
