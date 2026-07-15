import Link from "next/link";
import { randomUUID } from "node:crypto";
import { startJourneyAction } from "@/app/actions/journey";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import {
  participantCurrentStageLabel,
  participantJourneyPriority,
  participantNextActionLabel,
  participantNextHref,
  statusLabel
} from "@/lib/journey-runtime/navigation";

export default async function ParticipantHome() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  if (!auth.identity.entrepreneur_id) return <StatusPanel title="Perfil empreendedor não disponível" tone="warning"><p>A conta está autenticada, mas ainda não possui um perfil empreendedor ativo.</p></StatusPanel>;

  const [data, credentials] = await Promise.all([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] }))
  ]);
  const journeys = [...data.journeys].sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const nextJourney = journeys.find((journey) => journey.journey_status !== "completed") ?? journeys[0] ?? null;
  const inProgress = journeys.filter((journey) => journey.journey_status === "in_progress").length;
  const completed = journeys.filter((journey) => journey.journey_status === "completed").length;
  const totalPoints = journeys.reduce((sum, journey) => sum + (journey.p?.balance ?? 0), 0);
  const credentialCount = credentials.badges.length + credentials.certificates.length;

  return (
    <>
      <header className="page-heading dashboard-heading"><p className="eyebrow">Seu desenvolvimento</p><h1>Painel do empreendedor</h1><p>Acompanhe suas jornadas, retome a próxima atividade e consulte suas conquistas em um só lugar.</p></header>

      <section className="metrics-grid dashboard-metrics" aria-label="Resumo do desenvolvimento">
        <article className="metric"><span>Em andamento</span><strong>{inProgress}</strong></article>
        <article className="metric"><span>Concluídas</span><strong>{completed}</strong></article>
        <article className="metric"><span>Pontos registrados</span><strong>{totalPoints}</strong></article>
        <article className="metric"><span>Credenciais</span><strong>{credentialCount}</strong><Link href="/empreendedor/credenciais">Ver carteira</Link></article>
      </section>

      {journeys.length === 0 ? <StatusPanel title="Nenhuma jornada disponível" tone="info"><p>Quando uma jornada for atribuída ao seu perfil, ela aparecerá aqui.</p></StatusPanel> : null}

      {nextJourney ? <section className="dashboard-next" aria-labelledby="proxima-acao-titulo">
        <div className="dashboard-next-copy">
          <p className="eyebrow">Próxima ação</p>
          <h2 id="proxima-acao-titulo">{participantNextActionLabel(nextJourney)}</h2>
          <p className="lead">{nextJourney.journey_title ?? nextJourney.journey_code}</p>
          <p>{nextJourney.journey_description ?? participantCurrentStageLabel(nextJourney)}</p>
          <div className="dashboard-next-meta"><span className="status-pill">{statusLabel(nextJourney.journey_status)}</span><span>{participantCurrentStageLabel(nextJourney)}</span></div>
          {nextJourney.journey_status === "available" ? <form action={startJourneyAction}>
            <input type="hidden" name="journey_instance_id" value={nextJourney.journey_instance_id} />
            <input type="hidden" name="aggregate_version" value={nextJourney.journey_aggregate_version} />
            <input type="hidden" name="idempotency_key" value={randomUUID()} />
            <button className="button button--primary" type="submit">Começar jornada</button>
          </form> : <Link className="button button--primary" href={participantNextHref(nextJourney)}>{participantNextActionLabel(nextJourney)}</Link>}
        </div>
        <div className="dashboard-next-progress"><ProgressMeter value={nextJourney.progress} label="Progresso da jornada" /><p className="metadata">{nextJourney.completed_required_steps} de {nextJourney.total_required_steps} etapas obrigatórias concluídas.</p></div>
      </section> : null}

      {journeys.length ? <section className="dashboard-journeys stack stack--large" aria-labelledby="jornadas-titulo">
        <div><p className="eyebrow">Jornadas</p><h2 id="jornadas-titulo">Todas as suas jornadas</h2><p className="support-note">O progresso exibido vem do estado persistido da plataforma.</p></div>
        <div className="card-grid">
          {journeys.map((journey) => (
            <article className={`card journey-card journey-card--${journey.journey_status}`} key={journey.journey_instance_id}>
              <div className="card-meta"><span className="status-pill">{statusLabel(journey.journey_status)}</span><span>Versão {journey.journey_version_number}</span></div>
              <h3>{journey.journey_title ?? journey.journey_code}</h3>
              {journey.journey_description ? <p>{journey.journey_description}</p> : null}
              <p className="journey-stage-label">{participantCurrentStageLabel(journey)}</p>
              <ProgressMeter value={journey.progress} label="Progresso" />
              <p className="metadata">{journey.completed_required_steps}/{journey.total_required_steps} etapas obrigatórias · {journey.p?.balance ?? 0} pontos</p>
              {journey.journey_status === "available" ? (
                <form action={startJourneyAction}>
                  <input type="hidden" name="journey_instance_id" value={journey.journey_instance_id} />
                  <input type="hidden" name="aggregate_version" value={journey.journey_aggregate_version} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <button className="button button--primary" type="submit">Começar jornada</button>
                </form>
              ) : <Link className="button button--secondary" href={participantNextHref(journey)}>{participantNextActionLabel(journey)}</Link>}
            </article>
          ))}
        </div>
      </section> : null}
    </>
  );
}
