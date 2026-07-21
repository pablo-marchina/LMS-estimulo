import Link from "next/link";
import { randomUUID } from "node:crypto";
import { startJourneyAction } from "@/app/actions/journey";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { ProgressMeter, StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
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

  const [data, credentials, engagement] = await Promise.all([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null),
  ]);
  const journeys = [...data.journeys].sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const nextJourney = journeys.find((journey) => journey.journey_status !== "completed") ?? journeys[0] ?? null;
  const inProgress = journeys.filter((journey) => journey.journey_status === "in_progress").length;
  const completed = journeys.filter((journey) => journey.journey_status === "completed").length;
  const totalPoints = engagement?.own_rank?.points ?? journeys.reduce((sum, journey) => sum + (journey.p?.balance ?? 0), 0);
  const credentialCount = credentials.badges.length + credentials.certificates.length;
  const pendingRewards = engagement?.rewards.filter((reward) => !reward.earned) ?? [];

  return (
    <>
      <header className="page-heading dashboard-heading"><p className="eyebrow">Seu desenvolvimento</p><h1>Olá{engagement?.preferred_name ? `, ${engagement.preferred_name}` : ""}</h1><p>Acompanhe suas jornadas, retome a próxima atividade, veja seus pontos e descubra as próximas conquistas.</p></header>

      <AnnouncementCarousel announcements={engagement?.announcements ?? []} />

      <section className="metrics-grid dashboard-metrics" aria-label="Resumo do desenvolvimento">
        <article className="metric"><span>Em andamento</span><strong>{inProgress}</strong></article>
        <article className="metric"><span>Concluídas</span><strong>{completed}</strong></article>
        <article className="metric"><span>Pontos registrados</span><strong>{totalPoints}</strong>{engagement?.own_rank ? <span className="metadata">Posição {engagement.own_rank.position}</span> : null}</article>
        <article className="metric"><span>Credenciais</span><strong>{credentialCount}</strong><Link href="/empreendedor/credenciais">Ver carteira</Link></article>
      </section>

      {journeys.length === 0 ? <StatusPanel title="Nenhuma jornada disponível" tone="info"><p>Quando uma jornada for atribuída ao seu perfil, ela aparecerá aqui.</p></StatusPanel> : null}

      {nextJourney ? <section className="dashboard-next" aria-labelledby="proxima-acao-titulo">
        <div className="dashboard-next-copy">
          <p className="eyebrow">Continue de onde parou</p>
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

      {engagement?.rewards.length ? <section className="stack stack--large" aria-labelledby="recompensas-titulo">
        <div className="section-heading-row"><div><p className="eyebrow">O que você pode conquistar</p><h2 id="recompensas-titulo">Recompensas da sua jornada</h2></div><Link href="/empreendedor/credenciais">Abrir carteira</Link></div>
        <div className="reward-grid">
          {engagement.rewards.slice(0, 6).map((reward) => <article className={`reward-card${reward.earned ? " reward-card--earned" : ""}`} key={`${reward.type}:${reward.version_id}`}>
            <span className="reward-icon" aria-hidden="true">{reward.type === "badge" ? "★" : "✓"}</span>
            <div><p className="eyebrow">{reward.earned ? "Conquistado" : "Disponível"}</p><h3>{reward.title}</h3><p>{reward.description}</p></div>
          </article>)}
        </div>
        {pendingRewards.length ? <p className="support-note">Você ainda pode conquistar {pendingRewards.length} {pendingRewards.length === 1 ? "recompensa" : "recompensas"} nas jornadas atribuídas.</p> : <p className="support-note">Todas as recompensas disponíveis foram conquistadas.</p>}
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

      {engagement?.ranking.length ? <section className="stack stack--large" aria-labelledby="ranking-titulo">
        <div className="section-heading-row"><div><p className="eyebrow">Engajamento</p><h2 id="ranking-titulo">Ranking de pontos</h2></div><Link href="/empreendedor/perfil">Ver histórico completo</Link></div>
        <ol className="ranking-list">
          {engagement.ranking.map((entry) => <li className={entry.is_current ? "ranking-row ranking-row--current" : "ranking-row"} key={`${entry.position}:${entry.participant}`}>
            <span className="ranking-position">{entry.position}</span><strong>{entry.participant}</strong><span>{entry.points} pontos</span>
          </li>)}
        </ol>
        <p className="support-note">Outros participantes são exibidos por pseudônimo. O ranking mede somente pontos de aprendizagem e não afeta crédito.</p>
      </section> : null}
    </>
  );
}
