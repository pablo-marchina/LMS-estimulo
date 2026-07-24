import Link from "next/link";
import { ProgressMeter } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
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

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader
        eyebrow="Seu perfil"
        title={engagement.preferred_name ?? "Empreendedor"}
        description="Consulte seu diagnóstico, histórico de aprendizagem, pontuação e credenciais em um único lugar."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo do perfil">
        <Card>
          <h2 className="text-lg font-semibold text-ink">Identidade confirmada</h2>
          <p className="mt-2 text-sm text-ink">{engagement.email}</p>
          <p className="mt-2 text-xs text-muted">O CPF permanece protegido e não é exibido na interface.</p>
        </Card>
        <MetricTile
          index={0}
          label="Pontos acumulados"
          value={totalPoints}
          meta={engagement.own_rank ? `Posição ${engagement.own_rank.position}` : undefined}
        />
        <MetricTile index={1} label="Jornadas concluídas" value={completed.length} />
        <MetricTile
          index={2}
          label="Credenciais"
          value={credentials.badges.length + credentials.certificates.length}
          meta={<Link href="/empreendedor/credenciais" className="hover:underline">Abrir carteira</Link>}
        />
      </section>

      <section className="grid gap-4" aria-labelledby="diagnostico-perfil-titulo">
        <h2 id="diagnostico-perfil-titulo" className="text-xl font-semibold text-ink">
          Resultado do diagnóstico
        </h2>
        {archetype?.name ? (
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusPill tone="info">{archetype.classification_status}</StatusPill>
              <time dateTime={archetype.assigned_at} className="text-xs text-muted">
                {dateFormatter.format(new Date(archetype.assigned_at))}
              </time>
            </div>
            <h3 className="text-lg font-semibold text-ink">{archetype.name}</h3>
            {archetype.description ? <p className="mt-2 text-sm text-muted">{archetype.description}</p> : null}
            {archetype.probability !== null ? (
              <p className="mt-2 text-xs text-muted">Confiança registrada: {Math.round(archetype.probability * 100)}%</p>
            ) : null}
            <p className="mt-3 text-xs text-muted">
              O diagnóstico orienta a experiência educacional e não determina elegibilidade ou risco de crédito.
            </p>
          </Card>
        ) : (
          <EmptyState title="Diagnóstico ainda não concluído" tone="info">
            Quando houver um resultado oficial atribuído, ele aparecerá aqui.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="historico-jornadas-titulo">
        <h2 id="historico-jornadas-titulo" className="text-xl font-semibold text-ink">
          Jornadas e progresso
        </h2>
        {journeyData.journeys.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {journeyData.journeys.map((journey) => (
              <Card key={journey.journey_instance_id} className="flex flex-col">
                <div className="mb-4 flex items-center justify-between text-sm text-muted">
                  <StatusPill tone={journey.journey_status === "completed" ? "success" : "info"}>
                    {statusLabel(journey.journey_status)}
                  </StatusPill>
                  <span>Versão {journey.journey_version_number}</span>
                </div>
                <h3 className="font-semibold text-ink">{journey.journey_title ?? journey.journey_code}</h3>
                <p className="mt-2 text-sm text-muted">{participantCurrentStageLabel(journey)}</p>
                <ProgressMeter value={journey.progress} label="Progresso" />
                <p className="mt-2 text-xs text-muted">
                  {journey.completed_required_steps}/{journey.total_required_steps} etapas obrigatórias
                </p>
                <div className="mt-auto pt-4">
                  <ButtonLink href={participantNextHref(journey)} variant="secondary" size="sm">
                    {journey.journey_status === "completed" ? "Rever resultado" : "Abrir jornada"}
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Sem jornadas" tone="info">
            Seu histórico aparecerá quando uma jornada for atribuída.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="historico-pontos-titulo">
        <h2 id="historico-pontos-titulo" className="text-xl font-semibold text-ink">
          Histórico de pontuação
        </h2>
        {engagement.point_history.length ? (
          <ol className="grid gap-2">
            {engagement.point_history.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span
                  className={`w-16 shrink-0 text-right text-sm font-bold tabular-nums ${
                    entry.amount >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </span>
                <div>
                  <strong className="font-semibold text-ink">{entry.reason}</strong>
                  <time dateTime={entry.occurred_at} className="block text-xs text-muted">
                    {dateFormatter.format(new Date(entry.occurred_at))}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Nenhum ponto registrado" tone="info">
            As ações elegíveis aparecerão neste histórico.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
