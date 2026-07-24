import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowRight, BookOpen, Check, Clock3, Play, Trophy } from "lucide-react";
import { startJourneyAction } from "@/app/actions/journey";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { StatusPanel } from "@/components/status-panel";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
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
      <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
        <StatusPanel title="Perfil empreendedor não disponível" tone="warning">
          A conta está autenticada, mas ainda não possui um perfil empreendedor ativo.
        </StatusPanel>
      </div>
    );
  }

  const [data, credentials, engagement] = await Promise.all([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null)
  ]);
  const journeys = [...data.journeys].sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const nextJourney = journeys.find((journey) => journey.journey_status !== "completed") ?? journeys[0] ?? null;
  const otherJourneys = journeys.filter((journey) => journey.journey_instance_id !== nextJourney?.journey_instance_id);
  const totalPoints = engagement?.own_rank?.points ?? journeys.reduce((sum, journey) => sum + (journey.p?.balance ?? 0), 0);
  const credentialCount = credentials.badges.length + credentials.certificates.length;
  const pendingRewards = engagement?.rewards.filter((reward) => !reward.earned) ?? [];
  const firstName = (engagement?.preferred_name ?? "").trim().split(/\s+/)[0] || "Empreendedor";

  const outline = nextJourney
    ? await getParticipantJourneyOutline(auth.identity.user_account_id, nextJourney.journey_instance_id).catch(() => null)
    : null;
  const activities = outline ? outline.modules.flatMap((module) => module.activities) : [];

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <header>
        <p className="text-sm font-semibold text-muted">Olá, {firstName} 👋</p>
        <h1 className="display-font mt-2 text-4xl text-secondary sm:text-5xl">Vamos mover seu negócio?</h1>
        <Link href="/empreendedor/trilhas" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
          Ver todas as trilhas disponíveis
        </Link>
      </header>

      <AnnouncementCarousel announcements={engagement?.announcements ?? []} />

      {!nextJourney ? (
        <EmptyState icon={<BookOpen size={24} />} title="Sua rota está sendo preparada" tone="info" className="mt-8">
          Quando uma jornada for atribuída ao seu perfil, ela aparecerá aqui.
        </EmptyState>
      ) : (
        <>
          <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <article className="animate-in relative overflow-hidden rounded-card bg-primary p-7 text-white sm:p-9" aria-labelledby="proxima-acao-titulo">
              <div className="relative z-10 max-w-2xl">
                <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">
                  Continue de onde parou
                </span>
                <h2 id="proxima-acao-titulo" className="display-font mt-6 text-4xl leading-none sm:text-5xl">
                  {participantNextActionLabel(nextJourney)}
                </h2>
                <p className="mt-5 max-w-xl leading-7 text-white/70">
                  {nextJourney.journey_description ?? participantCurrentStageLabel(nextJourney)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/85">
                  <StatusPill tone="expressive" className="!bg-white/15 !text-white">
                    {statusLabel(nextJourney.journey_status)}
                  </StatusPill>
                  <span>{nextJourney.completed_required_steps} de {nextJourney.total_required_steps} etapas obrigatórias concluídas</span>
                </div>
                <div className="mt-8">
                  {nextJourney.journey_status === "available" ? (
                    <form action={startJourneyAction}>
                      <input type="hidden" name="journey_instance_id" value={nextJourney.journey_instance_id} />
                      <input type="hidden" name="aggregate_version" value={nextJourney.journey_aggregate_version} />
                      <input type="hidden" name="idempotency_key" value={randomUUID()} />
                      <Button type="submit" variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>
                        Começar jornada
                      </Button>
                    </form>
                  ) : (
                    <ButtonLink href={participantNextHref(nextJourney)} variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>
                      {participantNextActionLabel(nextJourney)}
                    </ButtonLink>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full border-[42px] border-brand-green/90" aria-hidden="true" />
            </article>

            <article className="rounded-card border border-border bg-brand-green p-6">
              <Trophy aria-hidden="true" />
              <p className="display-font mt-6 text-5xl text-secondary">{totalPoints}</p>
              <h2 className="mt-3 text-xl font-black text-secondary">Pontos de evolução</h2>
              <p className="mt-2 text-sm text-secondary/65">Seus pontos refletem atividades realizadas na plataforma.</p>
            </article>
          </section>

          <section className="mt-6 rounded-card border border-border bg-white p-6 sm:p-8" aria-labelledby="rota-titulo">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Sua rota personalizada</p>
                <h2 id="rota-titulo" className="mt-2 text-2xl font-black text-secondary">
                  {nextJourney.journey_title ?? nextJourney.journey_code}
                </h2>
              </div>
              <ButtonLink href={`/empreendedor/jornada/${nextJourney.journey_instance_id}`} variant="ghost" icon={<ArrowRight size={17} />}>
                Ver rota completa
              </ButtonLink>
            </div>
            {activities.length ? (
              <div className="mt-7 grid gap-3">
                {activities.slice(0, 3).map((activity, index) => (
                  <div key={activity.step_instance_id} className="grid items-center gap-4 rounded-xl border border-border p-4 sm:grid-cols-[44px_1fr_auto]">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full text-xs font-black ${
                        activity.step_status === "completed" ? "bg-brand-green" : "bg-primary text-white"
                      }`}
                    >
                      {activity.step_status === "completed" ? <Check size={16} /> : index + 1}
                    </span>
                    <h3 className="font-bold text-secondary">{activity.activity_title}</h3>
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                      <Clock3 size={14} /> {activity.estimated_minutes ?? "—"} min
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">Complete o diagnóstico inicial para liberar as atividades desta rota.</p>
            )}
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Resumo da rota">
            <Metric icon={BookOpen} value={String(nextJourney.total_required_steps)} label="atividades obrigatórias" />
            <Metric icon={Check} value={String(nextJourney.completed_required_steps)} label="atividades concluídas" />
            <Metric icon={Trophy} value={`${Math.round(nextJourney.progress * 100)}%`} label="da rota percorrida" />
          </section>
        </>
      )}

      {otherJourneys.length ? (
        <section className="mt-6 grid gap-4" aria-labelledby="outras-jornadas-titulo">
          <h2 id="outras-jornadas-titulo" className="text-xl font-black text-secondary">
            Outras jornadas
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {otherJourneys.map((journey) => (
              <Card key={journey.journey_instance_id} className="flex flex-col">
                <div className="mb-3 flex items-center justify-between text-sm text-muted">
                  <StatusPill tone={journey.journey_status === "completed" ? "success" : "info"}>{statusLabel(journey.journey_status)}</StatusPill>
                  <span>{Math.round(journey.progress * 100)}%</span>
                </div>
                <h3 className="font-bold text-secondary">{journey.journey_title ?? journey.journey_code}</h3>
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

      {engagement?.rewards.length ? (
        <section className="mt-6 grid gap-4" aria-labelledby="recompensas-titulo">
          <div className="flex items-end justify-between gap-4">
            <h2 id="recompensas-titulo" className="text-xl font-black text-secondary">
              Recompensas da sua jornada
            </h2>
            <Link href="/empreendedor/conquistas" className="text-sm font-semibold text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {engagement.rewards.slice(0, 6).map((reward) => (
              <Card key={`${reward.type}:${reward.version_id}`} className={reward.earned ? "border-success/30 bg-success-soft/40" : undefined}>
                <div className="flex items-start gap-4">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${
                      reward.earned ? "bg-brand-green text-secondary" : "bg-primary-light text-primary"
                    }`}
                    aria-hidden="true"
                  >
                    {reward.type === "badge" ? "★" : "✓"}
                  </span>
                  <div>
                    <StatusPill tone={reward.earned ? "success" : "neutral"}>{reward.earned ? "Conquistado" : "Disponível"}</StatusPill>
                    <h3 className="mt-2 font-bold text-secondary">{reward.title}</h3>
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

      {engagement?.ranking.length ? (
        <section className="mt-6 grid gap-4" aria-labelledby="ranking-titulo">
          <div className="flex items-end justify-between gap-4">
            <h2 id="ranking-titulo" className="text-xl font-black text-secondary">
              Ranking de pontos
            </h2>
            <Link href="/empreendedor/pontuacao" className="text-sm font-semibold text-primary hover:underline">
              Ver histórico completo
            </Link>
          </div>
          <ol className="grid gap-2">
            {engagement.ranking.map((entry) => (
              <li
                key={`${entry.position}:${entry.participant}`}
                className={`flex items-center gap-4 rounded-xl border p-4 ${
                  entry.is_current ? "border-primary bg-primary-light" : "border-border bg-white"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{entry.position}</span>
                <strong className="flex-1 font-bold text-secondary">{entry.participant}</strong>
                <span className="text-sm font-medium text-muted">{entry.points} pontos</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">Outros participantes são exibidos por pseudônimo. O ranking mede somente pontos de aprendizagem e não afeta crédito.</p>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Credenciais">
        <div className="flex items-center gap-4 rounded-card border border-border bg-white p-5">
          <div>
            <p className="text-2xl font-black text-secondary">{credentialCount}</p>
            <p className="text-sm text-muted">
              credenciais · <Link href="/empreendedor/credenciais" className="font-semibold text-primary hover:underline">Ver carteira</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-white/60 p-5">
      <Icon className="text-primary" aria-hidden="true" />
      <div>
        <p className="text-2xl font-black text-secondary">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
