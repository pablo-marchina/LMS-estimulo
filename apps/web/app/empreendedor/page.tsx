import Link from "next/link";
import { randomUUID } from "node:crypto";
import { startJourneyAction } from "@/app/actions/journey";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { StatusPanel } from "@/components/status-panel";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status-pill";
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
  if (!auth.identity.entrepreneur_id) {
    return (
      <StatusPanel title="Perfil empreendedor não disponível" tone="warning">
        A conta está autenticada, mas ainda não possui um perfil empreendedor ativo.
      </StatusPanel>
    );
  }

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
    <div className="grid gap-8">
      <header>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Seu desenvolvimento</p>
        <h1 className="text-3xl font-bold text-ink">Olá{engagement?.preferred_name ? `, ${engagement.preferred_name}` : ""}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Acompanhe suas jornadas, retome a próxima atividade, veja seus pontos e descubra as próximas conquistas.
        </p>
      </header>

      <AnnouncementCarousel announcements={engagement?.announcements ?? []} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo do desenvolvimento">
        <MetricTile index={0} label="Em andamento" value={inProgress} />
        <MetricTile index={1} label="Concluídas" value={completed} />
        <MetricTile
          index={2}
          label="Pontos registrados"
          value={totalPoints}
          meta={engagement?.own_rank ? `Posição ${engagement.own_rank.position}` : undefined}
        />
        <MetricTile
          index={3}
          label="Credenciais"
          value={credentialCount}
          meta={<Link href="/empreendedor/credenciais" className="hover:underline">Ver carteira</Link>}
        />
      </section>

      {journeys.length === 0 ? (
        <EmptyState title="Nenhuma jornada disponível" tone="info">
          Quando uma jornada for atribuída ao seu perfil, ela aparecerá aqui.
        </EmptyState>
      ) : null}

      {nextJourney ? (
        <section className="grid gap-6 rounded-xl bg-primary p-6 text-white sm:p-8 lg:grid-cols-[1.3fr_1fr]" aria-labelledby="proxima-acao-titulo">
          <div className="flex flex-col justify-center gap-3">
            <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Continue de onde parou</p>
            <h2 id="proxima-acao-titulo" className="text-2xl font-bold">
              {participantNextActionLabel(nextJourney)}
            </h2>
            <p className="font-semibold text-white/95">{nextJourney.journey_title ?? nextJourney.journey_code}</p>
            <p className="text-white/80">{nextJourney.journey_description ?? participantCurrentStageLabel(nextJourney)}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              <StatusPill tone="expressive" className="!bg-white/15 !text-white">
                {statusLabel(nextJourney.journey_status)}
              </StatusPill>
              <span>{participantCurrentStageLabel(nextJourney)}</span>
            </div>
            {nextJourney.journey_status === "available" ? (
              <form action={startJourneyAction} className="mt-1">
                <input type="hidden" name="journey_instance_id" value={nextJourney.journey_instance_id} />
                <input type="hidden" name="aggregate_version" value={nextJourney.journey_aggregate_version} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <Button type="submit" className="!bg-white !text-primary hover:!bg-white/90">
                  Começar jornada
                </Button>
              </form>
            ) : (
              <ButtonLink href={participantNextHref(nextJourney)} className="mt-1 w-fit !bg-white !text-primary hover:!bg-white/90">
                {participantNextActionLabel(nextJourney)}
              </ButtonLink>
            )}
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-lg bg-white/10 p-5">
            <Progress value={nextJourney.progress * 100} label="Progresso da jornada" className="[&_span]:text-white [&_span:last-child]:text-white/80" />
            <p className="text-sm text-white/75">
              {nextJourney.completed_required_steps} de {nextJourney.total_required_steps} etapas obrigatórias concluídas.
            </p>
          </div>
        </section>
      ) : null}

      {engagement?.rewards.length ? (
        <section className="grid gap-4" aria-labelledby="recompensas-titulo">
          <div className="flex items-end justify-between gap-4">
            <h2 id="recompensas-titulo" className="text-xl font-semibold text-ink">
              Recompensas da sua jornada
            </h2>
            <Link href="/empreendedor/credenciais" className="text-sm font-semibold text-primary hover:underline">
              Abrir carteira
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {engagement.rewards.slice(0, 6).map((reward) => (
              <Card key={`${reward.type}:${reward.version_id}`} className={reward.earned ? "border-success/30 bg-success-soft/40" : undefined}>
                <div className="flex items-start gap-4">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-lg text-lg font-bold ${
                      reward.earned ? "bg-success text-white" : "bg-primary-soft text-primary"
                    }`}
                    aria-hidden="true"
                  >
                    {reward.type === "badge" ? "★" : "✓"}
                  </span>
                  <div>
                    <StatusPill tone={reward.earned ? "success" : "neutral"}>{reward.earned ? "Conquistado" : "Disponível"}</StatusPill>
                    <h3 className="mt-2 font-semibold text-ink">{reward.title}</h3>
                    <p className="mt-1 text-sm text-muted">{reward.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted">
            {pendingRewards.length
              ? `Você ainda pode conquistar ${pendingRewards.length} ${pendingRewards.length === 1 ? "recompensa" : "recompensas"} nas jornadas atribuídas.`
              : "Todas as recompensas disponíveis foram conquistadas."}
          </p>
        </section>
      ) : null}

      {journeys.length ? (
        <section className="grid gap-4" aria-labelledby="jornadas-titulo">
          <div>
            <h2 id="jornadas-titulo" className="text-xl font-semibold text-ink">
              Todas as suas jornadas
            </h2>
            <p className="text-sm text-muted">O progresso exibido vem do estado persistido da plataforma.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {journeys.map((journey) => (
              <Card key={journey.journey_instance_id} className="flex flex-col">
                <div className="mb-4 flex items-center justify-between text-sm text-muted">
                  <StatusPill tone={journey.journey_status === "completed" ? "success" : "info"}>{statusLabel(journey.journey_status)}</StatusPill>
                  <span>Versão {journey.journey_version_number}</span>
                </div>
                <h3 className="font-semibold text-ink">{journey.journey_title ?? journey.journey_code}</h3>
                {journey.journey_description ? <p className="mt-1 text-sm text-muted">{journey.journey_description}</p> : null}
                <p className="mt-3 text-sm font-semibold text-primary">{participantCurrentStageLabel(journey)}</p>
                <Progress value={journey.progress * 100} label="Progresso" className="mt-3" />
                <p className="mt-2 text-xs text-muted">
                  {journey.completed_required_steps}/{journey.total_required_steps} etapas obrigatórias · {journey.p?.balance ?? 0} pontos
                </p>
                <div className="mt-auto pt-4">
                  {journey.journey_status === "available" ? (
                    <form action={startJourneyAction}>
                      <input type="hidden" name="journey_instance_id" value={journey.journey_instance_id} />
                      <input type="hidden" name="aggregate_version" value={journey.journey_aggregate_version} />
                      <input type="hidden" name="idempotency_key" value={randomUUID()} />
                      <Button type="submit" size="sm">
                        Começar jornada
                      </Button>
                    </form>
                  ) : (
                    <ButtonLink href={participantNextHref(journey)} variant="secondary" size="sm">
                      {participantNextActionLabel(journey)}
                    </ButtonLink>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {engagement?.ranking.length ? (
        <section className="grid gap-4" aria-labelledby="ranking-titulo">
          <div className="flex items-end justify-between gap-4">
            <h2 id="ranking-titulo" className="text-xl font-semibold text-ink">
              Ranking de pontos
            </h2>
            <Link href="/empreendedor/perfil" className="text-sm font-semibold text-primary hover:underline">
              Ver histórico completo
            </Link>
          </div>
          <ol className="grid gap-2">
            {engagement.ranking.map((entry) => (
              <li
                key={`${entry.position}:${entry.participant}`}
                className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
                  entry.is_current ? "border-border-strong bg-primary-soft" : "border-border bg-surface"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{entry.position}</span>
                <strong className="flex-1 font-semibold text-ink">{entry.participant}</strong>
                <span className="text-sm font-medium text-muted">{entry.points} pontos</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">Outros participantes são exibidos por pseudônimo. O ranking mede somente pontos de aprendizagem e não afeta crédito.</p>
        </section>
      ) : null}
    </div>
  );
}
