import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowRight, BookOpen, Play } from "lucide-react";
import { continueJourneyAction } from "@/app/empreendedor/continue-journey-action";
import { startProfileDiagnosticAction } from "@/app/empreendedor/perfil/actions";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

export default async function ParticipantHome() {
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
    participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id),
  ] as const);

  const participantJourneys = fulfilled(results[0]);
  const engagement = fulfilled(results[1]);
  const diagnosticEntry = fulfilled(results[2]);
  const dataUnavailable = results[0].status === "rejected" || results[1].status === "rejected";
  const journeys = [...(participantJourneys?.journeys ?? [])]
    .sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const activeJourneys = journeys.filter((journey) => journey.journey_status !== "completed").slice(0, 3);
  const firstName = (engagement?.preferred_name ?? "").trim().split(/\s+/)[0] || "Empreendedor";
  const diagnosticPending = !engagement?.archetype && diagnosticEntry?.status !== "completed";
  const diagnosticUnavailable = diagnosticEntry?.status === "not_configured";

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <section className="pb-10">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-muted">Olá, {firstName}!</p>
        <h1 className="max-w-3xl text-[30px] font-bold leading-[1.15] tracking-[-.02em] text-primary sm:text-[40px]">Vamos fazer seu negócio crescer?</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">Escolha um conteúdo, aprenda no seu ritmo e coloque em prática no dia a dia do seu negócio.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ButtonLink href="/empreendedor/jornadas" icon={<ArrowRight size={16} />}>Continuar aprendendo</ButtonLink>
          <ButtonLink href="/empreendedor/recompensas" variant="secondary">Ver recompensas</ButtonLink>
        </div>
      </section>

      {dataUnavailable ? <StatusPanel title="Não foi possível carregar o resumo completo" tone="warning"><p>Seu progresso continua salvo. Recarregue a página para tentar novamente.</p></StatusPanel> : null}

      <section className="border-t border-slate-200 pt-10" aria-labelledby="novidades-titulo">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Descubra</p>
          <h2 id="novidades-titulo" className="mt-1.5 text-xl font-bold text-ink sm:text-[22px]">Novidades para você</h2>
        </div>
        <AnnouncementCarousel announcements={engagement?.announcements ?? []} />
      </section>

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
