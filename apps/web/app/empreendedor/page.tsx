import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowRight, BookOpen, Play, Sparkles } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { continueJourneyAction } from "@/app/empreendedor/continue-journey-action";
import { startProfileDiagnosticAction } from "@/app/empreendedor/perfil/actions";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantCopy } from "@/lib/content/participant-copy";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { participantJourneyPriority, participantNextActionLabel, participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function featuredRank(presentation: { featured_rank?: unknown }) {
  return typeof presentation.featured_rank === "number" ? presentation.featured_rank : Number.MAX_SAFE_INTEGER;
}

export default async function ParticipantHome() {
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id),
    participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
  ] as const);

  const participantJourneys = fulfilled(results[0]);
  const eligibleJourneys = fulfilled(results[1]) ?? [];
  const diagnosticEntry = fulfilled(results[2]);
  const engagement = fulfilled(results[3]);
  const coreDataUnavailable = results[0].status === "rejected" || results[3].status === "rejected";
  const journeys = [...(participantJourneys?.journeys ?? [])]
    .sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const featuredEnrolled = journeys
    .filter((journey) => journey.journey_presentation?.featured === true)
    .sort((a, b) => featuredRank(a.journey_presentation ?? {}) - featuredRank(b.journey_presentation ?? {}))[0] ?? null;
  const featuredEligible = [...eligibleJourneys]
    .filter((journey) => journey.presentation?.featured === true)
    .sort((a, b) => featuredRank(a.presentation ?? {}) - featuredRank(b.presentation ?? {}))[0]
    ?? [...eligibleJourneys].sort((a, b) => {
      const featuredDifference = Number(b.presentation?.featured === true) - Number(a.presentation?.featured === true);
      return featuredDifference || featuredRank(a.presentation ?? {}) - featuredRank(b.presentation ?? {});
    })[0]
    ?? null;
  const featuredJourney = featuredEnrolled
    ? {
        kind: "enrolled" as const,
        title: featuredEnrolled.journey_title ?? featuredEnrolled.journey_code,
        description: featuredEnrolled.journey_description ?? null,
        presentation: featuredEnrolled.journey_presentation ?? {},
        journey: featuredEnrolled,
      }
    : featuredEligible
      ? {
          kind: "eligible" as const,
          title: featuredEligible.title,
          description: featuredEligible.description,
          presentation: featuredEligible.presentation ?? {},
          journey: featuredEligible,
        }
      : null;
  const activeJourneys = journeys
    .filter((journey) => journey.journey_status !== "completed")
    .filter((journey) => journey.journey_instance_id !== featuredEnrolled?.journey_instance_id)
    .slice(0, 3);
  const firstName = (engagement?.preferred_name ?? "").trim().split(/\s+/)[0] || "Empreendedor";
  const diagnosticPending = !engagement?.archetype && diagnosticEntry?.status !== "completed";
  const diagnosticUnavailable = diagnosticEntry?.status === "not_configured";

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <PageHeader
        cmsKey="participant.page.overview.header"
        eyebrow="Olá, {{nome}}!"
        title="Vamos fazer seu negócio crescer?"
        description="Escolha um conteúdo, aprenda no seu ritmo e coloque em prática no dia a dia do seu negócio."
        variables={{ nome: firstName }}
        actions={<>
          <ButtonLink href="/empreendedor/jornadas" icon={<ArrowRight size={16} />}>Continuar aprendendo</ButtonLink>
          <ButtonLink href="/empreendedor/recompensas" variant="secondary">Ver recompensas</ButtonLink>
        </>}
      />

      {coreDataUnavailable ? <StatusPanel title="Não foi possível carregar o resumo completo" tone="warning"><p>Seu progresso continua salvo. Recarregue a página para tentar novamente.</p></StatusPanel> : null}

      <section className="pt-5" aria-labelledby="novidades-titulo">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Descubra</p>
          <h2 id="novidades-titulo" className="mt-1.5 text-xl font-bold text-ink sm:text-[22px]">Novidades para você</h2>
        </div>
        <AnnouncementCarousel announcements={engagement?.announcements ?? []} />
      </section>

      {featuredJourney ? (
        <section className="mt-14" aria-labelledby="jornada-destaque-titulo">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Comece por aqui</p>
            <h2 id="jornada-destaque-titulo" className="mt-1.5 text-xl font-bold text-ink sm:text-[22px]">Jornada em destaque</h2>
          </div>
          <Card className="relative overflow-hidden border-primary/20 bg-primary-soft/40 p-6 sm:p-7">
            <div className="pointer-events-none absolute -right-8 -top-10 text-primary/10" aria-hidden="true"><Sparkles size={144} strokeWidth={1.25} /></div>
            <div className="relative max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">{typeof featuredJourney.presentation.badge === "string" ? featuredJourney.presentation.badge : "Capacitação Estímulo"}</p>
              <h3 className="mt-2 text-xl font-black text-secondary sm:text-2xl">{featuredJourney.title}</h3>
              {featuredJourney.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{featuredJourney.description}</p> : null}
              {featuredJourney.kind === "enrolled" ? (
                featuredJourney.journey.journey_status === "completed" ? (
                  <ButtonLink href={participantNextHref(featuredJourney.journey)} className="mt-5" icon={<ArrowRight size={16} />}>Rever jornada</ButtonLink>
                ) : (
                  <form action={continueJourneyAction} className="mt-5">
                    <input type="hidden" name="journey_instance_id" value={featuredJourney.journey.journey_instance_id} />
                    <input type="hidden" name="aggregate_version" value={featuredJourney.journey.journey_aggregate_version} />
                    <input type="hidden" name="idempotency_key" value={randomUUID()} />
                    <PendingSubmitButton pendingLabel="Abrindo jornada…" icon={<Play size={16} fill="currentColor" />}>
                      {participantNextActionLabel(featuredJourney.journey)}
                    </PendingSubmitButton>
                  </form>
                )
              ) : (
                <form action={selfEnrollAction} className="mt-5">
                  <input type="hidden" name="journey_version_id" value={featuredJourney.journey.journey_version_id} />
                  <input type="hidden" name="idempotency_key" value={randomUUID()} />
                  <PendingSubmitButton pendingLabel="Entrando na jornada…" icon={<Play size={16} fill="currentColor" />}>
                    {typeof featuredJourney.presentation.cta === "string" ? featuredJourney.presentation.cta : "Entrar nesta jornada"}
                  </PendingSubmitButton>
                </form>
              )}
            </div>
          </Card>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="em-andamento-titulo">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Continue avançando</p>
          <h2 id="em-andamento-titulo" className="mt-1.5 text-xl font-bold text-ink sm:text-[22px]">Em andamento</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">Continue de onde parou ou escolha uma nova jornada para aprender mais.</p>
        </div>
        {activeJourneys.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeJourneys.map((journey) => {
              const total = Math.max(0, journey.total_required_steps);
              const completed = Math.max(0, journey.completed_required_steps);
              const progress = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : Math.round((journey.progress ?? 0) * 100);
              return (
                <Card key={journey.journey_instance_id} className="flex min-h-52 flex-col p-5">
                  <StatusPill tone="info" className="w-fit">{statusLabel(journey.journey_status)}</StatusPill>
                  <h3 className="mt-4 text-[15px] font-semibold leading-snug text-ink">{journey.journey_title ?? journey.journey_code}</h3>
                  {journey.journey_description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{journey.journey_description}</p> : null}
                  <div className="mt-auto pt-5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted"><span>{completed} de {total} {participantCopy.journeys.completedProgressLabel}</span><span>{progress}%</span></div>
                    <div className="mt-4">
                      {journey.journey_status === "completed" ? (
                        <Link href={participantNextHref(journey)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Rever jornada <ArrowRight size={14} /></Link>
                      ) : (
                        <form action={continueJourneyAction}>
                          <input type="hidden" name="journey_instance_id" value={journey.journey_instance_id} />
                          <input type="hidden" name="aggregate_version" value={journey.journey_aggregate_version} />
                          <input type="hidden" name="idempotency_key" value={randomUUID()} />
                          <PendingSubmitButton pendingLabel="Abrindo jornada…" size="sm" icon={<Play size={15} fill="currentColor" />}>{participantNextActionLabel(journey)}</PendingSubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<BookOpen size={22} />} title="Escolha sua primeira jornada" tone="info"><p>Veja as jornadas disponíveis e comece pela que mais combina com seu momento.</p><ButtonLink href="/empreendedor/jornadas" className="mt-4">Explorar jornadas</ButtonLink></EmptyState>
        )}
      </section>

      {diagnosticPending ? (
        <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="diagnostico-home-titulo">
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Personalize sua experiência</p>
              <h2 id="diagnostico-home-titulo" className="mt-1.5 text-lg font-bold text-ink">Conheça seu perfil empreendedor</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">O diagnóstico ajuda a organizar recomendações e continua opcional para as jornadas abertas.</p>
            </div>
            <form action={startProfileDiagnosticAction} className="shrink-0"><PendingSubmitButton pendingLabel="Abrindo diagnóstico…" disabled={diagnosticUnavailable}>{diagnosticUnavailable ? "Diagnóstico indisponível" : diagnosticEntry?.status === "in_progress" ? "Continuar diagnóstico" : "Fazer diagnóstico"}</PendingSubmitButton></form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
