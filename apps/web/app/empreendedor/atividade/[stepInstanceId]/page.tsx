import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { acknowledgeActivityAction, submitQuickCheckAction } from "@/app/actions/e14";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { e14 } from "@/lib/e14/rpc";

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }

export default async function ActivityPage({ params, searchParams }: { params: Promise<{ stepInstanceId: string }>; searchParams: Promise<{ journey?: string }> }) {
  const [{ stepInstanceId }, { journey }] = await Promise.all([params, searchParams]);
  if (!journey) notFound();
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const experience = await e14.getParticipantExperience(auth.identity.user_account_id, journey);
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
            <h2>{text(section.title) ?? section.code}</h2>
            {text(section.body) ? <p>{text(section.body)}</p> : null}
            <label className="confirm-row"><input type="checkbox" name={`section_${section.code}`} /><span>Li e compreendi esta parte</span></label>
          </article>
        ))}
        {accepted < sectionTotal ? <button className="button button--primary" type="submit">Registrar leitura</button> : null}
      </form>

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
