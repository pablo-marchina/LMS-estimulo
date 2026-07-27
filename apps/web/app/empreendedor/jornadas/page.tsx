import { randomUUID } from "node:crypto";
import { BookOpen, CheckCircle2, Compass, Lightbulb, Play, Rocket, Sparkles } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { openJourneyAction } from "@/app/actions/open-journey";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
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

export default async function JornadasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [eligible, participant] = await Promise.all([
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id).catch(() => [] as EligibleJourney[]),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id).catch(() => ({ actor_user_account_id: auth.identity.user_account_id, entrepreneur_id: auth.identity.entrepreneur_id, journeys: [] })),
  ]);

  const enrolledModels: CatalogJourney[] = participant.journeys.map((journey) => ({
    key: `enrolled-${journey.journey_instance_id}`,
    title: journey.journey_title ?? journey.journey_code,
    description: journey.journey_description ?? null,
    presentation: journey.journey_presentation ?? {},
    enrolled: journey,
  }));
  const eligibleModels: CatalogJourney[] = eligible.map((journey) => ({
    key: `eligible-${journey.journey_version_id}`,
    title: journey.title,
    description: journey.description,
    presentation: journey.presentation ?? {},
    eligible: journey,
  }));
  const all = [...enrolledModels, ...eligibleModels];
  const featured = all.filter((journey) => journey.presentation.featured === true).sort((a, b) => rank(a.presentation) - rank(b.presentation))[0] ?? all[0] ?? null;
  const isFeatured = (journey: CatalogJourney) => journey.key === featured?.key;
  const inProgress = enrolledModels.filter((journey) => !isFeatured(journey) && journey.enrolled?.journey_status !== "completed");
  const completed = enrolledModels.filter((journey) => !isFeatured(journey) && journey.enrolled?.journey_status === "completed");
  const recommended = eligibleModels.filter((journey) => !isFeatured(journey) && !journey.eligible?.open_to_all);
  const open = eligibleModels.filter((journey) => !isFeatured(journey) && journey.eligible?.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Jornadas para aprender, aplicar e evoluir" description="Escolha um caminho, abra qualquer aula no seu ritmo e acompanhe o que cada jornada pode liberar." />
      {query.erro ? <StatusPanel title="Não foi possível entrar nesta jornada" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}

      {featured ? <FeaturedJourney journey={featured} /> : <Card className="mt-8"><p className="text-sm text-muted">A equipe ainda não definiu uma jornada em destaque.</p></Card>}

      <JourneySection eyebrow="Continue avançando" title="Em andamento" description="Retome suas jornadas ativas ou explore outra aula disponível." journeys={inProgress} empty="Quando você começar outra jornada, ela aparecerá aqui." />
      <JourneySection eyebrow="Feitas para o seu momento" title="Para começar" description="Jornadas recomendadas de acordo com seu perfil e as regras publicadas." journeys={recommended} empty="Não há novas recomendações específicas neste momento." />
      <JourneySection eyebrow="Mais possibilidades" title="Outras jornadas" description="Caminhos abertos para todos os participantes." journeys={open} empty="Novas jornadas abertas aparecerão nesta seção assim que forem publicadas." />
      <JourneySection eyebrow="Seu histórico" title="Concluídas" description="Reveja atividades, materiais e resultados sempre que precisar." journeys={completed} empty="Suas jornadas concluídas ficarão organizadas aqui." />
    </div>
  );
}

function FeaturedJourney({ journey }: { journey: CatalogJourney }) {
  const presentation = journey.presentation;
  const tags = Array.isArray(presentation.tags) ? presentation.tags : [];
  const tone = typeof presentation.tone === "string" ? presentation.tone : "blue";
  return (
    <section className={`brand-featured-journey brand-dots-bg relative mt-8 overflow-hidden rounded-[2rem] p-7 shadow-lg sm:p-10 ${toneClasses[tone] ?? toneClasses.blue}`} aria-labelledby="featured-journey-title">
      <div className="absolute -bottom-16 -right-12 size-52 rounded-full border-[34px] border-white/15" aria-hidden="true" />
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{iconFor(presentation.icon, 14)} {typeof presentation.eyebrow === "string" ? presentation.eyebrow : "Jornada em destaque"}</span>
          <div className="mt-6 flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-md">{iconFor(presentation.icon, 28)}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-white/65">{typeof presentation.badge === "string" ? presentation.badge : "Capacitação Estímulo"}</p><h2 id="featured-journey-title" className="display-font mt-1 text-3xl text-white sm:text-4xl">{journey.title}</h2><p className="mt-3 max-w-2xl leading-7 text-white/80">{journey.description}</p></div></div>
          {tags.length ? <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/90">{tags.map((tag) => <span key={tag} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5">{tag}</span>)}</div> : null}
          {journey.enrolled ? <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/90"><StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(journey.enrolled.journey_status)}</StatusPill><span>{journey.enrolled.completed_required_steps} de {journey.enrolled.total_required_steps} atividades obrigatórias concluídas</span></div> : null}
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
  return <Card className={`brand-journey-card ${tones[index % tones.length]} flex flex-col`}><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/90 text-primary shadow-sm">{journey.enrolled?.journey_status === "completed" ? <CheckCircle2 size={21} /> : iconFor(presentation.icon, 21)}</span><StatusPill tone={journey.enrolled?.journey_status === "completed" ? "success" : journey.enrolled ? "info" : journey.eligible?.open_to_all ? "neutral" : "expressive"}>{journey.enrolled ? statusLabel(journey.enrolled.journey_status) : journey.eligible?.open_to_all ? "Aberta para todos" : "Indicada para você"}</StatusPill></div><p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-primary/70">{typeof presentation.badge === "string" ? presentation.badge : "Jornada Estímulo"}</p><h3 className="mt-1 font-black text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{journey.description}</p> : null}{journey.enrolled ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(journey.enrolled.progress * 100)}%` }} /></div> : null}<div className="mt-auto pt-5"><JourneyAction journey={journey} /></div></Card>;
}

function JourneyAction({ journey, large = false }: { journey: CatalogJourney; large?: boolean }) {
  if (journey.enrolled) {
    if (journey.enrolled.journey_status === "completed") return <ButtonLink href={participantNextHref(journey.enrolled)} variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} icon={<Play size={16} />}>Rever jornada</ButtonLink>;
    return <form action={openJourneyAction}><input type="hidden" name="journey_instance_id" value={journey.enrolled.journey_instance_id} /><input type="hidden" name="aggregate_version" value={journey.enrolled.journey_aggregate_version} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} icon={<Play size={16} fill="currentColor" />}>{participantNextActionLabel(journey.enrolled)}</Button></form>;
  }
  if (journey.eligible) return <form action={selfEnrollAction}><input type="hidden" name="journey_version_id" value={journey.eligible.journey_version_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} type="submit" icon={<Play size={16} fill="currentColor" />}>{typeof journey.presentation.cta === "string" ? journey.presentation.cta : "Entrar nesta jornada"}</Button></form>;
  return null;
}