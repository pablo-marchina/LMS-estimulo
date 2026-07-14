import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { acknowledgeActivityAction, createActivityCommentAction, submitQuickCheckAction } from "@/app/actions/journey";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }

const commentDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo"
});

export default async function ActivityPage({
  params,
  searchParams
}: {
  params: Promise<{ stepInstanceId: string }>;
  searchParams: Promise<{ journey?: string; comentario?: string }>;
}) {
  const [{ stepInstanceId }, query] = await Promise.all([params, searchParams]);
  const journey = query.journey;
  if (!journey) notFound();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const [experience, commentResult] = await Promise.all([
    journeyRuntime.getParticipantExperience(auth.identity.user_account_id, journey),
    journeyRuntime.listActivityComments(auth.identity.user_account_id, stepInstanceId)
  ]);
  if (experience.state.s?.step_instance_id !== stepInstanceId || !experience.activity) notFound();

  const accepted = experience.state.s.accepted_sections;
  const sectionTotal = experience.activity.sections.length;
  const canAssess = sectionTotal > 0 && accepted >= sectionTotal;
  return (
    <>
      <header className="page-heading"><p className="eyebrow">Atividade</p><h1>{experience.activity.title}</h1><p>{experience.activity.description}</p><p className="metadata">Tempo estimado: {experience.activity.estimated_minutes} minutos</p></header>
      <ProgressMeter value={sectionTotal ? accepted / sectionTotal : 0} label="Conteúdo confirmado" />
      <form action={acknowledgeActivityAction} className="stack stack--large">
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

      <section className="comments-section stack stack--large" id="comentarios" aria-labelledby="comentarios-titulo">
        <div>
          <p className="eyebrow">Participação</p>
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
                <div className="comment-header"><strong>{comment.author_name}</strong>{comment.is_own ? <span className="status-pill">Você</span> : null}<time dateTime={comment.created_at}>{commentDateFormatter.format(new Date(comment.created_at))}</time></div>
                <p>{comment.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {experience.state.q?.status === "failed" ? <StatusPanel title="Revise e tente novamente" tone="warning"><p>A tentativa anterior não atingiu o critério da atividade. O resultado é pedagógico e não representa risco ou elegibilidade de crédito.</p></StatusPanel> : null}
      {experience.state.q?.passed ? <StatusPanel title="Atividade concluída" tone="success"><p>O resultado e os pontos já foram registrados no ledger da jornada.</p></StatusPanel> : null}

      {canAssess && !experience.state.q?.passed && experience.assessment?.questions[0] ? (
        <form action={submitQuickCheckAction} className="question-card stack">
          <input type="hidden" name="journey_instance_id" value={journey} />
          <input type="hidden" name="step_instance_id" value={stepInstanceId} />
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <h2>Verificação rápida</h2>
          <p>{experience.assessment.questions[0].prompt}</p>
          {experience.assessment.questions[0].response ? (
            <>
              <input type="hidden" name="answer" value={experience.assessment.questions[0].response.option_code} />
              <p className="form-message">Resposta já registrada. A submissão continuará de forma idempotente.</p>
            </>
          ) : (
            <div className="option-list">
              {experience.assessment.questions[0].options.map((option) => <label className="option" key={option.id}><input type="radio" name="answer" value={option.code} required /><span>{option.label}</span></label>)}
            </div>
          )}
          <button className="button button--primary" type="submit">Enviar resposta</button>
        </form>
      ) : null}
    </>
  );
}
