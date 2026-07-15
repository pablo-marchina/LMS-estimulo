import { randomUUID } from "node:crypto";
import Link from "next/link";
import { submitDiagnosisAction } from "@/app/actions/journey";
import { JourneyProgressNav } from "@/components/journey-progress-nav";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export default async function DiagnosisPage({ searchParams }: { searchParams: Promise<{ journey?: string }> }) {
  const { journey } = await searchParams;
  if (!journey) return <StatusPanel title="Jornada não informada" tone="warning"><p>Volte para o painel e selecione uma jornada.</p><Link className="button button--secondary" href="/empreendedor">Ir para o painel</Link></StatusPanel>;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const experience = await journeyRuntime.getParticipantExperience(auth.identity.user_account_id, journey);

  if (experience.state.d?.status === "completed") {
    const step = experience.state.s?.step_instance_id;
    return <>
      <header className="page-heading"><p className="eyebrow">Diagnóstico</p><h1>{experience.journey.title}</h1><p>Seu caminho de aprendizagem já foi definido com base nas respostas registradas.</p></header>
      <JourneyProgressNav state={experience.state} current="diagnostic" />
      <StatusPanel title="Diagnóstico concluído" tone="success"><p>Esta etapa está concluída e não precisa ser respondida novamente.</p>{step ? <Link className="button button--primary" href={`/empreendedor/atividade/${step}?journey=${journey}`}>Continuar aprendizagem</Link> : null}</StatusPanel>
    </>;
  }
  if (!experience.diagnostic) return <><JourneyProgressNav state={experience.state} current="diagnostic" /><StatusPanel title="Diagnóstico indisponível" tone="warning"><p>A versão publicada desta jornada não possui um diagnóstico disponível.</p><Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link></StatusPanel></>;

  return (
    <>
      <header className="page-heading"><p className="eyebrow">Etapa 1</p><h1>Diagnóstico inicial</h1><p>As respostas ajudam a escolher o próximo passo da jornada. Elas não constituem avaliação de crédito.</p></header>
      <JourneyProgressNav state={experience.state} current="diagnostic" />
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
        <div className="form-footer"><Link className="button button--secondary" href="/empreendedor">Voltar ao painel</Link><button className="button button--primary" type="submit">Concluir diagnóstico</button></div>
      </form>
    </>
  );
}
