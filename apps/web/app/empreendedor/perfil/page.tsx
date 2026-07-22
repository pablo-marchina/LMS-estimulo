import Link from "next/link";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { participantCurrentStageLabel, participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Sao_Paulo",
});

export default async function ParticipantProfilePage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || !auth.identity.entrepreneur_id) return null;

  const [engagement, journeyData, credentials] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
  ]);
  const completed = journeyData.journeys.filter((journey) => journey.journey_status === "completed");
  const totalPoints = engagement.own_rank?.points ?? 0;
  const archetype = engagement.archetype;

  return <>
    <header className="page-heading">
      <p className="eyebrow">Seu perfil</p>
      <h1>{engagement.preferred_name ?? "Empreendedor"}</h1>
      <p>Consulte seu diagnóstico, histórico de aprendizagem, pontuação e credenciais em um único lugar.</p>
    </header>

    <section className="profile-summary-grid" aria-label="Resumo do perfil">
      <article className="card"><h2>Identidade confirmada</h2><p>{engagement.email}</p><p className="support-note">O CPF permanece protegido e não é exibido na interface.</p></article>
      <article className="metric"><span>Pontos acumulados</span><strong>{totalPoints}</strong>{engagement.own_rank ? <span>Posição {engagement.own_rank.position}</span> : null}</article>
      <article className="metric"><span>Jornadas concluídas</span><strong>{completed.length}</strong></article>
      <article className="metric"><span>Credenciais</span><strong>{credentials.badges.length + credentials.certificates.length}</strong><Link href="/empreendedor/credenciais">Abrir carteira</Link></article>
    </section>

    <section className="stack stack--large" aria-labelledby="diagnostico-perfil-titulo">
      <h2 id="diagnostico-perfil-titulo">Resultado do diagnóstico</h2>
      {archetype?.name ? <article className="card profile-archetype">
        <div className="card-meta"><span className="status-pill">{archetype.classification_status}</span><time dateTime={archetype.assigned_at}>{dateFormatter.format(new Date(archetype.assigned_at))}</time></div>
        <h3>{archetype.name}</h3>
        {archetype.description ? <p>{archetype.description}</p> : null}
        {archetype.probability !== null ? <p className="metadata">Confiança registrada: {Math.round(archetype.probability * 100)}%</p> : null}
        <p className="support-note">O diagnóstico orienta a experiência educacional e não determina elegibilidade ou risco de crédito.</p>
      </article> : <StatusPanel title="Diagnóstico ainda não concluído" tone="info"><p>Quando houver um resultado oficial atribuído, ele aparecerá aqui.</p></StatusPanel>}
    </section>

    <section className="stack stack--large" aria-labelledby="historico-jornadas-titulo">
      <h2 id="historico-jornadas-titulo">Jornadas e progresso</h2>
      {journeyData.journeys.length ? <div className="card-grid">{journeyData.journeys.map((journey) => <article className="card" key={journey.journey_instance_id}>
        <div className="card-meta"><span className="status-pill">{statusLabel(journey.journey_status)}</span><span>Versão {journey.journey_version_number}</span></div>
        <h3>{journey.journey_title ?? journey.journey_code}</h3>
        <p>{participantCurrentStageLabel(journey)}</p>
        <ProgressMeter value={journey.progress} label="Progresso" />
        <p className="metadata">{journey.completed_required_steps}/{journey.total_required_steps} etapas obrigatórias</p>
        <Link className="button button--secondary" href={participantNextHref(journey)}>{journey.journey_status === "completed" ? "Rever resultado" : "Abrir jornada"}</Link>
      </article>)}</div> : <StatusPanel title="Sem jornadas" tone="info"><p>Seu histórico aparecerá quando uma jornada for atribuída.</p></StatusPanel>}
    </section>

    <section className="stack stack--large" aria-labelledby="historico-pontos-titulo">
      <h2 id="historico-pontos-titulo">Histórico de pontuação</h2>
      {engagement.point_history.length ? <ol className="point-history">{engagement.point_history.map((entry) => <li key={entry.id}>
        <span className={entry.amount >= 0 ? "point-amount point-amount--positive" : "point-amount point-amount--negative"}>{entry.amount >= 0 ? "+" : ""}{entry.amount}</span>
        <div><strong>{entry.reason}</strong><time dateTime={entry.occurred_at}>{dateFormatter.format(new Date(entry.occurred_at))}</time></div>
      </li>)}</ol> : <StatusPanel title="Nenhum ponto registrado" tone="info"><p>As ações elegíveis aparecerão neste histórico.</p></StatusPanel>}
    </section>
  </>;
}
