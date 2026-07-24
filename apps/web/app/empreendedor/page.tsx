import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Bot, BookOpen, Play, Sparkles, Trophy } from "lucide-react";
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
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";
import {
  participantCurrentStageLabel,
  participantJourneyPriority,
  participantNextActionLabel,
  participantNextHref,
  statusLabel,
} from "@/lib/journey-runtime/navigation";

const OPENAI_JOURNEY_VERSION_ID = "a4ffebde-f7de-4a76-af6a-221a2c398dd6";

export default async function ParticipantHome() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;
  if (!auth.identity.entrepreneur_id) {
    return <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-9 lg:py-10"><StatusPanel title="Perfil empreendedor não disponível" tone="warning">A conta está autenticada, mas ainda não possui um perfil empreendedor ativo.</StatusPanel></div>;
  }

  const [data, credentials, engagement, eligibleJourneys] = await Promise.all([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id).catch(() => ({ actor_user_account_id: auth.identity.user_account_id, entrepreneur_id: auth.identity.entrepreneur_id, journeys: [] })),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null),
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id).catch(() => [] as EligibleJourney[]),
  ]);

  const journeys = [...data.journeys].sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const nextJourney = journeys.find((journey) => journey.journey_status !== "completed") ?? journeys[0] ?? null;
  const enrolledVersionIds = new Set(journeys.map((journey) => journey.journey_version_id));
  const availableJourneys = eligibleJourneys
    .filter((journey) => !enrolledVersionIds.has(journey.journey_version_id))
    .sort((a, b) => Number(b.journey_version_id === OPENAI_JOURNEY_VERSION_ID) - Number(a.journey_version_id === OPENAI_JOURNEY_VERSION_ID))
    .slice(0, 3);
  const totalPoints = engagement?.own_rank?.points ?? journeys.reduce((sum, journey) => sum + (journey.p?.balance ?? 0), 0);
  const credentialCount = credentials.badges.length + credentials.certificates.length;
  const pendingRewards = engagement?.rewards.filter((reward) => !reward.earned) ?? [];
  const firstName = (engagement?.preferred_name ?? "").trim().split(/\s+/)[0] || "Empreendedor";

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-9 lg:py-8">
      <AnnouncementCarousel announcements={engagement?.announcements ?? []} />

      <header className="brand-welcome-strip mt-8">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-primary"><Sparkles size={16} /> Olá, {firstName}!</p>
          <h1 className="display-font mt-2 text-4xl text-secondary sm:text-5xl">Vamos mover seu negócio?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">Escolha o próximo passo, aplique no seu ritmo e veja sua evolução ganhar forma.</p>
        </div>
        <div className="brand-welcome-bubbles" aria-hidden="true"><span /><span /><span /></div>
      </header>

      {!nextJourney ? (
        <EmptyState icon={<BookOpen size={24} />} title="Escolha sua primeira jornada" tone="info" className="brand-spark-card mt-8">
          <p>Veja as jornadas disponíveis e comece pela que mais combina com o seu momento.</p>
          <ButtonLink href="/empreendedor/jornadas" className="mt-4">Explorar jornadas</ButtonLink>
        </EmptyState>
      ) : (
        <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]" aria-label="Continue de onde parou">
          <article className="brand-hero animate-in relative overflow-hidden rounded-card p-7 text-white shadow-lg sm:p-9" aria-labelledby="proxima-acao-titulo">
            <div className="relative z-10 max-w-2xl">
              <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">Continue de onde parou</span>
              <h2 id="proxima-acao-titulo" className="display-font mt-6 text-4xl leading-none sm:text-5xl">{participantNextActionLabel(nextJourney)}</h2>
              <p className="mt-5 max-w-xl leading-7 text-white/80">{nextJourney.journey_description ?? participantCurrentStageLabel(nextJourney)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/90"><StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(nextJourney.journey_status)}</StatusPill><span>{nextJourney.completed_required_steps} de {nextJourney.total_required_steps} etapas obrigatórias concluídas</span></div>
              <div className="mt-8">
                {nextJourney.journey_status === "available" ? <form action={startJourneyAction}><input type="hidden" name="journey_instance_id" value={nextJourney.journey_instance_id} /><input type="hidden" name="aggregate_version" value={nextJourney.journey_aggregate_version} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><Button type="submit" variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>Começar jornada</Button></form> : <ButtonLink href={participantNextHref(nextJourney)} variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>{participantNextActionLabel(nextJourney)}</ButtonLink>}
              </div>
            </div>
          </article>
          <article className="brand-points-card rounded-card p-6 shadow-md"><Trophy aria-hidden="true" /><p className="display-font mt-6 text-5xl text-secondary">{totalPoints}</p><h2 className="mt-3 text-xl font-black text-secondary">Pontos de evolução</h2><p className="mt-2 text-sm text-secondary/70">Cada atividade concluída ajuda a transformar aprendizado em progresso visível.</p></article>
        </section>
      )}

      <section className="mt-10 grid gap-4" aria-labelledby="jornadas-disponiveis-titulo">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="brand-kicker">Próximos caminhos</p><h2 id="jornadas-disponiveis-titulo" className="display-font mt-1 text-2xl text-secondary">Jornadas disponíveis para você</h2></div><Link href="/empreendedor/jornadas" className="text-sm font-bold text-primary hover:underline">Ver todas as jornadas</Link></div>
        {availableJourneys.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{availableJourneys.map((journey, index) => {
          const isOpenAI = journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID;
          const tone = ["journey-card-cyan", "journey-card-green", "journey-card-magenta"][index % 3];
          return <Card key={journey.journey_version_id} className={`brand-journey-card ${tone} flex flex-col ${isOpenAI ? "ring-2 ring-primary/20" : ""}`}>{isOpenAI ? <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary text-white shadow-md"><Bot size={21} /></span> : null}<StatusPill tone={isOpenAI ? "expressive" : journey.open_to_all ? "neutral" : "info"}>{isOpenAI ? "OpenAI em destaque" : journey.open_to_all ? "Aberta para todos" : "Indicada para seu perfil"}</StatusPill><h3 className="mt-3 font-black text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 text-sm leading-6 text-muted">{journey.description}</p> : null}<Link href="/empreendedor/jornadas" className="mt-auto pt-5 text-sm font-bold text-primary hover:underline">Ver detalhes e entrar</Link></Card>;
        })}</div> : <p className="rounded-card border border-border bg-white/85 p-5 text-sm text-muted shadow-sm">Você já entrou em todas as jornadas disponíveis no momento.</p>}
      </section>

      <section className="brand-recognition-strip mt-8 flex flex-wrap items-center justify-between gap-4" aria-labelledby="recompensas-resumo-titulo">
        <div><h2 id="recompensas-resumo-titulo" className="font-black text-secondary">Suas conquistas</h2><p className="mt-1 text-sm text-muted">{credentialCount} {credentialCount === 1 ? "credencial conquistada" : "credenciais conquistadas"}{pendingRewards.length ? ` · ${pendingRewards.length} ainda disponíveis` : " · nenhuma recompensa pendente"}.</p></div>
        <Link href="/empreendedor/conquistas" className="text-sm font-bold text-primary hover:underline">Ver selos e certificados</Link>
      </section>
    </div>
  );
}
