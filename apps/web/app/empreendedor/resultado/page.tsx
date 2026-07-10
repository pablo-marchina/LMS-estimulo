import Link from "next/link";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { statusLabel } from "@/lib/journey-runtime/navigation";

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ journey?: string }> }) {
  const { journey } = await searchParams;
  if (!journey) return <StatusPanel title="Jornada não informada" tone="warning"><p>Selecione uma jornada para consultar o resultado.</p></StatusPanel>;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  const state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journey);

  return (
    <>
      <header className="page-heading"><p className="eyebrow">Resultado da jornada</p><h1>{state.journey_title ?? state.journey_code}</h1><p>Veja apenas fatos registrados durante a experiência de aprendizagem.</p></header>
      <div className="metrics-grid">
        <article className="metric"><span>Status</span><strong>{statusLabel(state.journey_status)}</strong></article>
        <article className="metric"><span>Pontos registrados</span><strong>{state.p?.balance ?? 0}</strong></article>
        <article className="metric"><span>Etapas obrigatórias</span><strong>{state.completed_required_steps}/{state.total_required_steps}</strong></article>
      </div>
      <ProgressMeter value={state.progress} label="Progresso total" />
      <StatusPanel title="Como interpretar estes dados" tone="info"><p>Conclusão, respostas e pontos são evidências da jornada de aprendizagem. A plataforma não os apresenta como score, risco ou decisão de crédito sem uma validação institucional específica.</p></StatusPanel>
      <Link className="button button--secondary" href="/empreendedor">Voltar às jornadas</Link>
    </>
  );
}
