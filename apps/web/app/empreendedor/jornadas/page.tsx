import { randomUUID } from "node:crypto";
import { Bot, CheckCircle2, Compass, Play, Sparkles } from "lucide-react";
import { selfEnrollAction } from "@/app/actions/enrollment";
import { openJourneyAction } from "@/app/actions/open-journey";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPanel } from "@/components/status-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getAuthContext } from "@/lib/auth/context";
import type { JourneyState } from "@/lib/journey-runtime/contracts";
import { participantNextActionLabel, participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";

const OPENAI_JOURNEY_VERSION_ID = "a4ffebde-f7de-4a76-af6a-221a2c398dd6";

export default async function JornadasCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [eligible, participant] = await Promise.all([
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id).catch(() => [] as EligibleJourney[]),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id).catch(() => ({ actor_user_account_id: auth.identity.user_account_id, entrepreneur_id: auth.identity.entrepreneur_id, journeys: [] })),
  ]);

  const enrolled = participant.journeys;
  const enrolledOpenAI = enrolled.find((journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID || /openai/i.test(journey.journey_title ?? "")) ?? null;
  const eligibleOpenAI = eligible.find((journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID || /openai/i.test(journey.title)) ?? null;
  const openAITitle = eligibleOpenAI?.title ?? enrolledOpenAI?.journey_title ?? "Capacitação em IA para MEI/ME – Estímulo <> OpenAI";
  const openAIDescription = eligibleOpenAI?.description ?? enrolledOpenAI?.journey_description ?? "Uma jornada prática para aplicar inteligência artificial em marketing, vendas, gestão e desenvolvimento digital.";

  const remaining = eligible.filter((journey) => journey !== eligibleOpenAI);
  const matched = remaining.filter((journey) => !journey.open_to_all);
  const open = remaining.filter((journey) => journey.open_to_all);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Capacitação" title="Jornadas que movem o seu negócio" description="Escolha um caminho, avance no seu ritmo e transforme aprendizado em aplicação prática." />
      {query.erro ? <StatusPanel title="Não foi possível entrar nesta jornada" tone="warning"><p>Tente novamente em instantes.</p></StatusPanel> : null}

      <section className="brand-hero brand-dots-bg relative mt-8 overflow-hidden rounded-[2rem] p-7 shadow-lg sm:p-10" aria-labelledby="openai-journey-title">
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary"><Sparkles size={14} /> Jornada OpenAI em destaque</span>
            <div className="mt-6 flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-md"><Bot size={28} /></span>
              <div><h2 id="openai-journey-title" className="display-font text-3xl text-white sm:text-4xl">{openAITitle}</h2><p className="mt-3 max-w-2xl leading-7 text-white/80">{openAIDescription}</p></div>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/85"><span className="rounded-full border border-white/25 bg-white/8 px-3 py-1.5">Marketing e Vendas com IA</span><span className="rounded-full border border-white/25 bg-white/8 px-3 py-1.5">Gestão com IA</span><span className="rounded-full border border-white/25 bg-white/8 px-3 py-1.5">Desenvolvimento com Codex</span></div>
            {enrolledOpenAI ? <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/85"><StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(enrolledOpenAI.journey_status)}</StatusPill><span>{enrolledOpenAI.completed_required_steps} de {enrolledOpenAI.total_required_steps} etapas obrigatórias concluídas</span></div> : null}
          </div>

          {enrolledOpenAI ? (
            enrolledOpenAI.journey_status === "completed" ? <ButtonLink href={participantNextHref(enrolledOpenAI)} variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>{participantNextActionLabel(enrolledOpenAI)}</ButtonLink> : <OpenJourneyForm journey={enrolledOpenAI} large />
          ) : eligibleOpenAI ? (
            <form action={selfEnrollAction}><input type="hidden" name="journey_version_id" value={eligibleOpenAI.journey_version_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button variant="secondary" size="lg" type="submit" icon={<Play size={17} fill="currentColor" />}>Começar jornada OpenAI</Button></form>
          ) : <ButtonLink href="/empreendedor" variant="secondary" size="lg">Voltar ao início</ButtonLink>}
        </div>
      </section>

      {enrolled.length ? <section className="mt-10 grid gap-4" aria-labelledby="minhas-jornadas-titulo"><div><p className="brand-kicker">Continue avançando</p><h2 id="minhas-jornadas-titulo" className="display-font mt-1 text-2xl text-secondary">Minhas jornadas</h2></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{enrolled.map((journey, index) => <EnrolledJourneyCard key={journey.journey_instance_id} journey={journey} index={index} />)}</div></section> : null}
      {!eligible.length && !enrolled.length ? <EmptyState icon={<Compass size={24} />} title="Nenhuma jornada disponível agora" tone="info" className="mt-8">Novas jornadas aparecem aqui assim que forem publicadas.</EmptyState> : null}
      {matched.length ? <section className="mt-10 grid gap-4" aria-labelledby="jornadas-arquetipo-titulo"><div><p className="brand-kicker">Feitas para o seu momento</p><h2 id="jornadas-arquetipo-titulo" className="display-font mt-1 text-2xl text-secondary">Jornadas para o seu perfil</h2></div><JourneyGrid journeys={matched} /></section> : null}
      {open.length ? <section className="mt-10 grid gap-4" aria-labelledby="jornadas-abertas-titulo"><div><p className="brand-kicker">Mais possibilidades</p><h2 id="jornadas-abertas-titulo" className="display-font mt-1 text-2xl text-secondary">Outras jornadas abertas para todos</h2></div><JourneyGrid journeys={open} /></section> : null}
    </div>
  );
}

function OpenJourneyForm({ journey, large = false }: { journey: JourneyState; large?: boolean }) {
  return <form action={openJourneyAction}><input type="hidden" name="journey_instance_id" value={journey.journey_instance_id} /><input type="hidden" name="aggregate_version" value={journey.journey_aggregate_version} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" variant={large ? "secondary" : "primary"} size={large ? "lg" : "sm"} className={large ? undefined : "mt-5 self-start"} icon={<Play size={large ? 17 : 15} fill={large ? "currentColor" : undefined} />}>{participantNextActionLabel(journey)}</Button></form>;
}

function EnrolledJourneyCard({ journey, index }: { journey: JourneyState; index: number }) {
  const tone = ["journey-card-cyan", "journey-card-green", "journey-card-magenta"][index % 3];
  return <Card className={`brand-journey-card ${tone} flex flex-col`}><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/85 text-primary shadow-sm"><CheckCircle2 size={21} /></span><StatusPill tone={journey.journey_status === "completed" ? "success" : "info"}>{statusLabel(journey.journey_status)}</StatusPill></div><h3 className="mt-5 font-black text-secondary">{journey.journey_title ?? journey.journey_code}</h3>{journey.journey_description ? <p className="mt-2 text-sm leading-6 text-muted">{journey.journey_description}</p> : null}<div className="mt-5 h-2 overflow-hidden rounded-full bg-white/75"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(4, Math.round(journey.progress * 100))}%` }} /></div>{journey.journey_status === "completed" ? <ButtonLink href={participantNextHref(journey)} size="sm" className="mt-5 self-start" icon={<Play size={15} />}>{participantNextActionLabel(journey)}</ButtonLink> : <OpenJourneyForm journey={journey} />}</Card>;
}

function JourneyGrid({ journeys }: { journeys: EligibleJourney[] }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{journeys.map((journey) => <Card key={journey.journey_version_id} className="brand-accent-card flex flex-col"><h3 className="font-bold text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 text-sm text-muted">{journey.description}</p> : null}<form action={selfEnrollAction} className="mt-auto pt-4"><input type="hidden" name="journey_version_id" value={journey.journey_version_id} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" size="sm">Entrar nesta jornada</Button></form></Card>)}</div>;
}
