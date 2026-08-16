import { randomUUID } from "node:crypto";
import { BookOpen, CheckCircle2, Compass, Lightbulb, Play, Rocket, Sparkles } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { openJourneyAction } from "@/app/actions/open-journey";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantCopy } from "@/lib/content/participant-copy";
import type { JourneyPresentation, JourneyState } from "@/lib/journey-runtime/contracts";
import { participantNextActionLabel, participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";

type CatalogJourney = {
  key: string;
  title: string;
  description: string | null;
  presentation: JourneyPresentation;
  enrolled?: JourneyState;
  eligible?: EligibleJourney;
};

const toneClasses: Record<string, string> = {
  blue: "bg-primary text-white",
  green: "bg-success text-white",
  cyan: "bg-info text-white",
  magenta: "bg-secondary text-white",
  orange: "bg-warning text-white",
};

function iconFor(name: unknown, size = 24) {
  const props = { size, "aria-hidden": true } as const;
  if (name === "rocket") return <Rocket {...props} />;
  if (name === "book" || name === "book-open") return <BookOpen {...props} />;
  if (name === "lightbulb") return <Lightbulb {...props} />;
  return <Sparkles {...props} />;
}

function rank(presentation: JourneyPresentation) {
  return typeof presentation.featured_rank === "number" ? presentation.featured_rank : 9999;
}

function journeyVersionId(journey: CatalogJourney) {
  return journey.enrolled?.journey_version_id ?? journey.eligible?.journey_version_id ?? null;
}

function coverHref(journey: CatalogJourney, variant: "card" | "featured") {
  const versionId = journeyVersionId(journey);
  const presentation = journey.presentation;
  const hasCover = variant === "featured" ? Boolean(presentation.featured_background_file_object_id || presentation.card_background_file_object_id) : Boolean(presentation.card_background_file_object_id);
  if (!versionId || !hasCover) return null;
  const resolvedVariant = variant === "featured" && !presentation.featured_background_file_object_id ? "card" : variant;
  return `/api/journey-covers/${versionId}/${resolvedVariant}`;
}

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function JornadasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
  ] as const);
  const eligible = fulfilled(results[0]) ?? [];
  const participant = fulfilled(results[1]);
  const dataUnavailable = results.some((result) => result.status === "rejected");

  const enrolledModels: CatalogJourney[] = (participant?.journeys ?? []).map((journey) => ({ key: `enrolled-${journey.journey_instance_id}`, title: journey.journey_title ?? journey.journey_code, description: journey.journey_description ?? null, presentation: journey.journey_presentation ?? {}, enrolled: journey }));
  const eligibleModels: CatalogJourney[] = eligible.map((journey) => ({ key: `eligible-${journey.journey_version_id}`, title: journey.title, description: journey.description, presentation: journey.presentation ?? {}, eligible: journey }));
  const all = [...enrolledModels, ...eligibleModels];
  const featured = all.filter((journey) => journey.presentation.featured === true).sort((a, b) => rank(a.presentation) - rank(b.presentation))[0] ?? all[0] ?? null;
  const isFeatured = (journey: CatalogJourney) => journey.key === featured?.key;
  const inProgress = enrolledModels.filter((journey) => journey.enrolled?.journey_status !== "completed");
  const completed = enrolledModels.filter((journey) => !isFeatured(journey) && journey.enrolled?.journey_status === "completed");
  const recommended = eligibleModels.filter((journey) => !isFeatured(journey) && !journey.eligible?.open_to_all);
  const open = eligibleModels.filter((journey) => !isFeatured(journey) && journey.eligible?.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Jornadas para aprender, aplicar e evoluir" description="Escolha uma jornada, avance no seu ritmo e acompanhe seu aprendizado." />
      {dataUnavailable ? <StatusPanel title="O catálogo não pôde ser atualizado por completo" tone="warning"><p>Nenhuma jornada foi removida. Recarregue a página para tentar novamente.</p></StatusPanel> : null}
      {query.erro ? <StatusPanel title="Não foi possível entrar nesta jornada" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}
      {query.aviso === "diagnostico_requer_jornada" ? <StatusPanel title="Escolha uma jornada para iniciar o diagnóstico" tone="info"><p>Ao entrar em uma jornada, o diagnóstico ficará disponível no seu perfil.</p></StatusPanel> : null}
      {featured ? <FeaturedJourney journey={featured} /> : dataUnavailable ? null : <Card className="mt-8"><p className="text-sm text-muted">A equipe ainda não definiu uma jornada principal.</p></Card>}
      <JourneySection eyebrow="Continue avançando" title="Em andamento" description={participantCopy.journeys.inProgressDescription} journeys={inProgress} empty={participantCopy.journeys.inProgressEmpty} />
      <JourneySection eyebrow="Feitas para o seu momento" title={participantCopy.journeys.recommendedTitle} description={participantCopy.journeys.recommendedDescription} journeys={recommended} empty={participantCopy.journeys.recommendedEmpty} />
      <JourneySection eyebrow="Mais possibilidades" title="Outras jornadas" description={participantCopy.journeys.openDescription} journeys={open} empty="Novas jornadas disponíveis aparecerão aqui quando forem publicadas." />
      <JourneySection eyebrow="Seu histórico" title="Concluídas" description={participantCopy.journeys.completedDescription} journeys={completed} empty={participantCopy.journeys.completedEmpty} />
    </div>
  );
}

function FeaturedJourney({ journey }: { journey: CatalogJourney }) {
  const presentation = journey.presentation;
  const tags = Array.isArray(presentation.tags) ? presentation.tags : [];
  const tone = typeof presentation.tone === "string" ? presentation.tone : "blue";
  const cover = coverHref(journey, "featured");
  return (
    <section className={`brand-featured-journey relative mt-8 min-h-[25rem] overflow-hidden rounded-[1.5rem] p-7 shadow-md sm:p-10 ${toneClasses[tone] ?? toneClasses.blue}`} aria-labelledby="featured-journey-title">
      {cover ? <><img src={cover} alt={typeof presentation.featured_background_alt === "string" ? presentation.featured_background_alt : ""} loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover max-sm:opacity-25" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25 max-sm:bg-black/70" aria-hidden="true" /></> : <div className="brand-dots-bg absolute inset-0 opacity-50" aria-hidden="true" />}
      <div className="absolute -bottom-16 -right-12 size-52 rounded-full border-[34px] border-white/15" aria-hidden="true" />
      <div className="relative z-10 grid min-h-[20rem] items-center gap-8 max-sm:min-h-0 lg:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{iconFor(presentation.icon, 14)} {typeof presentation.eyebrow === "string" ? presentation.eyebrow : "Capacitação Estímulo"}</span>
          <div className="mt-6 flex items-start gap-4 max-sm:flex-col"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-md">{iconFor(presentation.icon, 28)}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-white/70">{typeof presentation.badge === "string" ? presentation.badge : "Capacitação Estímulo"}</p><h2 id="featured-journey-title" className="display-font mt-1 text-3xl text-white sm:text-4xl">{journey.title}</h2><p className="mt-3 max-w-2xl leading-7 text-white/85">{journey.description}</p></div></div>
          {tags.length ? <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/95">{tags.map((tag) => <span key={tag} className="rounded-full border border-white/30 bg-black/20 px-3 py-1.5">{tag}</span>)}</div> : null}
          {journey.enrolled ? <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/95"><StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(journey.enrolled.journey_status)}</StatusPill><span>{journey.enrolled.completed_required_steps} de {journey.enrolled.total_required_steps} {participantCopy.journeys.completedProgressLabel}</span></div> : null}
        </div>
        <JourneyAction journey={journey} large />
      </div>
    </section>
  );
}

function JourneySection({ eyebrow, title, description, journeys, empty }: { eyebrow: string; title: string; description: string; journeys: CatalogJourney[]; empty: string }) {
  return <section className="mt-10 grid gap-4" aria-labelledby={`section-${title.replaceAll(" ", "-").toLowerCase()}`}><div><p className="brand-kicker">{eyebrow}</p><h2 id={`section-${title.replaceAll(" ", "-").toLowerCase()}`} className="display-font mt-1 text-2xl text-secondary">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>{journeys.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{journeys.map((journey, index) => <JourneyCard key={journey.key} journey={journey} index={index} />)}</div> : <div className="rounded-2xl border border-dashed border-border-strong bg-white/65 p-5 text-sm text-muted"><Compass className="mb-2 text-primary" size={20} />{empty}</div>}</section>;
}

function JourneyCard({ journey, index }: { journey: CatalogJourney; index: number }) {
  const tones = ["journey-card-cyan", "journey-card-green", "journey-card-magenta"];
  const presentation = journey.presentation;
  const cover = coverHref(journey, "card");
  return <Card className={`brand-journey-card ${tones[index % tones.length]} flex min-h-[24rem] flex-col overflow-hidden p-0 after:!hidden`}><div className="relative aspect-square overflow-hidden bg-primary-soft">{cover ? <img src={cover} alt={typeof presentation.card_background_alt === "string" ? presentation.card_background_alt : ""} loading="lazy" decoding="async" className="size-full object-cover transition duration-700 hover:scale-105" /> : <div className="grid size-full place-items-center"><span className="grid size-16 place-items-center rounded-3xl bg-white text-primary shadow-md">{iconFor(presentation.icon, 28)}</span></div>}<div className="absolute left-4 top-4"><StatusPill tone={journey.enrolled?.journey_status === "completed" ? "success" : journey.enrolled ? "info" : journey.eligible?.open_to_all ? "neutral" : "expressive"}>{journey.enrolled ? statusLabel(journey.enrolled.journey_status) : journey.eligible?.open_to_all ? participantCopy.journeys.openBadge : "Indicada para você"}</StatusPill></div></div><div className="flex flex-1 flex-col p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary/70">{typeof presentation.badge === "string" ? presentation.badge : "Jornada Estímulo"}</p><h3 className="mt-1 font-black text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{journey.description}</p> : null}{journey.enrolled ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(journey.enrolled.progress * 100)}%` }} /></div> : null}<div className="mt-auto pt-5"><JourneyAction journey={journey} /></div></div></Card>;
}

function JourneyAction({ journey, large = false }: { journey: CatalogJourney; large?: boolean }) {
  if (journey.enrolled) {
    if (journey.enrolled.journey_status === "completed") return <ButtonLink href={participantNextHref(journey.enrolled)} variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} icon={<CheckCircle2 size={16} />}>Rever jornada</ButtonLink>;
    return <form action={openJourneyAction}><input type="hidden" name="journey_instance_id" value={journey.enrolled.journey_instance_id} /><input type="hidden" name="aggregate_version" value={journey.enrolled.journey_aggregate_version} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><PendingSubmitButton pendingLabel="Abrindo jornada…" variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} icon={<Play size={16} fill="currentColor" />}>{participantNextActionLabel(journey.enrolled)}</PendingSubmitButton></form>;
  }
  if (journey.eligible) return <form action={selfEnrollAction}><input type="hidden" name="journey_version_id" value={journey.eligible.journey_version_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><PendingSubmitButton pendingLabel="Entrando na jornada…" variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} icon={<Play size={16} fill="currentColor" />}>{typeof journey.presentation.cta === "string" ? journey.presentation.cta : "Entrar nesta jornada"}</PendingSubmitButton></form>;
  return null;
}
