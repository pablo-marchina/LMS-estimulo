import { randomUUID } from "node:crypto";
import Link from "next/link";
import { submitDiagnosisAction } from "@/app/actions/journey";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ journey?: string }> }) {
  const { journey } = await searchParams;
  if (!journey) return <StatusPanel title="Jornada não informada" tone="warning"><p>Volte para suas jornadas e selecione uma opção.</p></StatusPanel>;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const experience = await journeyRuntime.getParticipantExperience(auth.identity.user_account_id, journey);

  if (experience.state.d?.status === "completed") {
    const step = experience.state.s?.step_instance_id;
    return <StatusPanel title="Diagnóstico concluído" tone="success"><p>Seu caminho de aprendizagem já foi definido com base nas respostas registradas.</p>{step ? <Link className="button button--primary" href={`/empreendedor/atividade/${step}?journey=${journey}`}>Ir para a atividade</Link> : null}</StatusPanel>;
  }
  if (!experience.diagnostic) return <StatusPanel title="Diagnóstico indisponível" tone="warning"><p>A versão publicada desta jornada não possui um diagnóstico disponível.</p></StatusPanel>;

  return (
    <>
      <header className="page-heading"><p className="eyebrow">Etapa 1</p><h1>Diagnóstico inicial</h1><p>As respostas ajudam a escolher o próximo passo da jornada. Elas não constituem avaliação de crédito.</p></header>
      <form action={submitDiagnosisAction} className="stack stack--large">
        <input type="hidden" name="journey_instance_id" value={journey} />
        <input type="hidden" name="idempotency_key" value={randomUUID()} />
        {experience.diagnostic.items.map((item, index) => (
          <fieldset className="question-card" key={item.id}>
            <legend><span>Questão {index + 1}</span>{item.prompt}</legend>
            <div className="option-list">
              {item.options.map((option) => <label className="option" key={option.id}><input type="radio" name={`answer_${item.id}`} value={option.code} required={item.is_required} defaultChecked={item.response?.option_code === option.code} /><span>{option.label}</span></label>)}
            </div>
          </fieldset>
        ))}
        <button className="button button--primary" type="submit">Concluir diagnóstico</button>
      </form>
    </>
  );
}
