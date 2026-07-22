import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { acknowledgeActivityAction, createActivityCommentAction, rateActivityUtilityAction, submitQuickCheckAction } from "@/app/actions/journey";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
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
    <>
      <header className="page-heading"><p className="eyebrow">Atividade</p><h1>{experience.activity.title}</h1><p>{experience.activity.description}</p><p className="metadata">Tempo estimado: {experience.activity.estimated_minutes} minutos</p></header>
      <JourneyProgressNav state={experience.state} current="activity" />
      <ProgressMeter value={sectionTotal ? accepted / sectionTotal : 0} label="Conteúdo confirmado" />
      <form action={acknowledgeActivityAction} className="stack stack--large" id="conteudo">
        <input type="hidden" name="journey_instance_id" value={journey} />
        <input type="hidden" name="step_instance_id" value={stepInstanceId} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        {experience.activity.sections.map((section, index) => (
          <article className="content-section" key={section.code}>
            <p className="eyebrow">Parte {index + 1}</p>
            <h2>{text(section.heading) ?? text(section.title) ?? section.code}</h2>
            {text(section.body) ? <p>{text(section.body)}</p> : null}
            <label className="confirm-row"><input type="checkbox" name={`section_${section.code}`} /><span>Li e compreendi esta parte</span></label>
          </article>
        ))}
        {accepted < sectionTotal ? <button className="button button--primary" type="submit">Registrar leitura</button> : null}
      </form>

      {practice ? <section className="practice-section stack stack--large" id="pratica" aria-labelledby="pratica-titulo">
        <div>
          <h2 id="pratica-titulo">Envie sua evidência</h2>
          <p className="support-note">Formatos aceitos: PDF, imagem, TXT ou DOCX. Limite de 6 MB. O arquivo permanece privado e é validado por formato, tamanho, hash e autorização de acesso.</p>
        </div>
        {query.pratica === "enviada" ? <StatusPanel title="Arquivo recebido" tone="success"><p>A evidência foi registrada e já está disponível para a etapa de revisão aplicável.</p></StatusPanel> : null}
        {query.pratica === "erro" ? <StatusPanel title="Envio não concluído" tone="warning"><p>{practiceError}</p></StatusPanel> : null}
        {canUpload ? <form action="/api/practice-uploads" method="post" encType="multipart/form-data" className="card stack">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <label htmlFor="practice-file">Arquivo da prática<input id="practice-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx" required /></label>
          <label className="consent-row"><input type="checkbox" name="allow_public_use" /><span>Autorizo o Estímulo a avaliar este material para possíveis estudos de caso e evidências de impacto. A autorização é opcional e não altera a conclusão da atividade.</span></label>
          {practice.terms_version ? <p className="metadata">Termos aplicáveis: {practice.terms_version}.</p> : null}
          <button className="button button--primary" type="submit">Enviar evidência</button>
        </form> : <StatusPanel title="Limite de envios atingido" tone="info"><p>Esta atividade não aceita novos arquivos no momento.</p></StatusPanel>}
        {submissions.length === 0 ? <StatusPanel title="Nenhuma evidência enviada" tone="info"><p>Seu histórico de envios aparecerá aqui.</p></StatusPanel> : <div className="practice-list">
          {submissions.map((submission) => <article className="practice-card" key={submission.id}>
            <div className="practice-header"><strong>Envio {submission.submission_number}</strong><span className="status-pill">{practiceStatus[submission.status] ?? submission.status}</span><time dateTime={submission.submitted_at}>{dateFormatter.format(new Date(submission.submitted_at))}</time></div>
            <p>{submission.original_filename ?? "Arquivo em preparação"}</p>
            <div className="practice-meta"><span>{submission.content_type ?? "Formato em validação"}</span>{fileSize(submission.size_bytes) ? <span>{fileSize(submission.size_bytes)}</span> : null}<span>{submission.allow_public_use ? "Uso autorizado" : "Uso público não autorizado"}</span></div>
            {submission.review_feedback ? <p className="moderation-reason"><strong>Retorno da revisão:</strong> {submission.review_feedback}</p> : null}
            {submission.can_download ? <Link className="button button--secondary" href={`/api/practice-submissions/${submission.id}/download`}>Baixar arquivo</Link> : null}
          </article>)}
        </div>}
      </section> : null}

      {canAssess ? <section className="card stack" id="utilidade" aria-labelledby="utilidade-titulo">
        <div>
          <h2 id="utilidade-titulo">Esta atividade foi útil?</h2>
          <p className="support-note">A nota de 1 a 5 melhora a capacitação. Ela não altera sua conclusão, seus pontos ou qualquer decisão de crédito.</p>
        </div>
        {query.utilidade === "registrada" ? <StatusPanel title="Avaliação registrada" tone="success"><p>Obrigado. A revisão anterior permanece no histórico e esta é a nota atual.</p></StatusPanel> : null}
        <form action={rateActivityUtilityAction} className="stack">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <fieldset className="option-list">
            <legend>Escolha de 1 a 5 estrelas</legend>
            {[1, 2, 3, 4, 5].map((rating) => <label className="option" key={rating}>
              <input type="radio" name="rating" value={rating} defaultChecked={utilityRating.rating === rating} required />
              <span>{rating} {rating === 1 ? "estrela" : "estrelas"}</span>
            </label>)}
          </fieldset>
          <button className="button button--secondary" type="submit">{utilityRating.rating ? "Atualizar avaliação" : "Enviar avaliação"}</button>
          {utilityRating.rating ? <p className="metadata">Nota atual: {utilityRating.rating}/5 · revisão {utilityRating.revision}.</p> : null}
        </form>
      </section> : null}

      <section className="comments-section stack stack--large" id="comentarios" aria-labelledby="comentarios-titulo">
        <div>
          <h2 id="comentarios-titulo">Comentários da aula</h2>
          <p className="support-note">Compartilhe sua experiência com a atividade. Não publique dados pessoais, senhas ou informações financeiras.</p>
        </div>
        {query.comentario === "criado" ? <StatusPanel title="Comentário publicado" tone="success"><p>Sua participação já está visível nesta aula.</p></StatusPanel> : null}
        <form action={createActivityCommentAction} className="card stack">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <label htmlFor="activity-comment">Escreva seu comentário</label>
          <textarea id="activity-comment" name="body" minLength={1} maxLength={2000} rows={4} required placeholder="Conte como você usa o ChatGPT no dia a dia ou responda à pergunta proposta na aula." />
          <div className="form-footer"><span className="metadata">Máximo de 2.000 caracteres.</span><button className="button button--primary" type="submit">Publicar comentário</button></div>
        </form>
        {commentResult.comments.length === 0 ? (
          <StatusPanel title="Nenhum comentário ainda" tone="info"><p>Seja a primeira pessoa a participar desta aula.</p></StatusPanel>
        ) : (
          <div className="comment-list" aria-live="polite">
            {commentResult.comments.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <div className="comment-header"><strong>{comment.author_name}</strong>{comment.is_own ? <span className="status-pill">Você</span> : null}<time dateTime={comment.created_at}>{dateFormatter.format(new Date(comment.created_at))}</time></div>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {query.avaliacao === "reprovada" || experience.state.q?.status === "failed" ? <StatusPanel title="Revise e tente novamente" tone="warning"><p>A tentativa anterior não atingiu o critério da atividade. O resultado é pedagógico e não representa risco ou elegibilidade de crédito.</p></StatusPanel> : null}
      {experience.state.q?.passed ? <StatusPanel title="Atividade concluída" tone="success"><p>O resultado, os pontos e as credenciais elegíveis foram processados.</p></StatusPanel> : null}
      {canAssess && assessment && !experience.state.q?.passed && !attemptAvailable ? <StatusPanel title="Limite de tentativas atingido" tone="warning"><p>Não há uma nova tentativa disponível para esta versão da avaliação.</p></StatusPanel> : null}

      {canAssess && assessment?.questions.length && !experience.state.q?.passed && attemptAvailable ? (
        <form action={submitQuickCheckAction} className="assessment-form stack stack--large" id="avaliacao">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <div className="card">
            <h2>Verifique o que aprendeu</h2>
            <p className="support-note">{assessment.questions.length} {assessment.questions.length === 1 ? "questão" : "questões"}{assessment.passing_score !== null ? ` · aprovação a partir de ${assessment.passing_score}%` : ""}{maxAttempts !== null ? ` · até ${maxAttempts} tentativas` : ""}.</p>
          </div>
          {assessment.questions.map((question, index) => <fieldset className="question-card" key={question.id}>
            <legend><span>Questão {index + 1}</span>{question.prompt}</legend>
            {question.response ? <>
              <input type="hidden" name={`answer_${question.id}`} value={question.response.option_code} />
              <p className="form-message">Resposta registrada nesta tentativa.</p>
            </> : <div className="option-list">
              {question.options.map((option) => <label className="option" key={option.id}><input type="radio" name={`answer_${question.id}`} value={option.code} required /><span>{option.label}</span></label>)}
            </div>}
          </fieldset>)}
          <button className="button button--primary" type="submit">Enviar avaliação</button>
        </form>
      ) : null}

      <div className="form-footer journey-page-footer no-print">
        <Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link>
        {experience.state.q?.passed ? <Link className="button button--primary" href={`/empreendedor/resultado?journey=${journey}`}>Ver resultado</Link> : canAssess && assessment?.questions.length ? <Link className="button button--primary" href="#avaliacao">Ir para avaliação</Link> : <Link className="button button--secondary" href="#conteudo">Voltar ao conteúdo</Link>}
      </div>
    </>
  );
}
