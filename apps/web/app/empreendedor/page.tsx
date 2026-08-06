import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Award, BookOpen, CheckCircle2, Play, Rocket, Sparkles, Trophy } from "lucide-react";
import { continueJourneyAction } from "@/app/empreendedor/continue-journey-action";
import { startProfileDiagnosticAction } from "@/app/empreendedor/perfil/actions";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantCopy } from "@/lib/content/participant-copy";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime, type EligibleJourney } from "@/lib/journey-runtime/rpc";
import { participantCurrentStageLabel, participantJourneyPriority, participantNextActionLabel, participantNextHref, statusLabel } from "@/lib/journey-runtime/navigation";

function rank(journey: EligibleJourney) {
  return typeof journey.presentation?.featured_rank === "number" ? journey.presentation.featured_rank : 9999;
}

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export default async function ParticipantHome() {
  const auth = await requireParticipantContext();

  const results = await Promise.allSettled([
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
    engagementRuntime.participantHub(auth.identity.user_account_id),
    journeyRuntime.listEligibleJourneys(auth.identity.user_account_id),
    participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id),
    engagementRuntime.participantFeaturedBadges(auth.identity.user_account_id),
  ] as const);

  const participantJourneys = fulfilled(results[0]);
  const credentials = fulfilled(results[1]);
  const engagement = fulfilled(results[2]);
  const eligibleJourneys = fulfilled(results[3]) ?? [];
  const diagnosticEntry = fulfilled(results[4]);
  const featuredBadges = fulfilled(results[5]);
  const dataUnavailable = results.some((result) => result.status === "rejected");

  const journeys = [...(participantJourneys?.journeys ?? [])].sort((a, b) => participantJourneyPriority(a) - participantJourneyPriority(b));
  const nextJourney = journeys.find((journey) => journey.journey_status !== "completed") ?? journeys[0] ?? null;
  const enrolledVersionIds = new Set(journeys.map((journey) => journey.journey_version_id));
  const availableJourneys = eligibleJourneys.filter((journey) => !enrolledVersionIds.has(journey.journey_version_id)).sort((a, b) => Number(Boolean(b.presentation?.featured)) - Number(Boolean(a.presentation?.featured)) || rank(a) - rank(b)).slice(0, 3);
  const totalPoints = engagement?.own_rank?.points ?? journeys.reduce((sum, journey) => sum + (journey.p?.balance ?? 0), 0);
  const credentialCount = (credentials?.badges.length ?? 0) + (credentials?.certificates.length ?? 0);
  const pendingRewards = engagement?.rewards.filter((reward) => !reward.earned) ?? [];
  const highlightedBadges = featuredBadges?.badges ?? [];
  const recognitionItems = highlightedBadges.length
    ? highlightedBadges.map((badge) => ({ type: "badge" as const, version_id: badge.badge_version_id, title: badge.title, description: badge.description, earned: badge.earned }))
    : pendingRewards;
  const firstName = (engagement?.preferred_name ?? "").trim().split(/\s+/)[0] || "Empreendedor";
  const diagnosticPending = !engagement?.archetype && diagnosticEntry?.status !== "completed";
  const diagnosticUnavailable = diagnosticEntry?.status === "not_configured";

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 lg:px-9 lg:py-8">
      <PageHeader cmsKey="participant.page.overview.header" eyebrow={`Olá, ${firstName}!`} title="Vamos fazer seu negócio crescer?" description="Escolha um conteúdo, aprenda no seu ritmo e coloque em prática no dia a dia do seu negócio." />

      {dataUnavailable ? <StatusPanel title="Algumas informações não puderam ser atualizadas" tone="warning"><p>Seus dados continuam salvos. Recarregue a página para tentar novamente.</p></StatusPanel> : null}

      <div className="mt-6"><AnnouncementCarousel announcements={engagement?.announcements ?? []} /></div>

      {!nextJourney ? <EmptyState icon={<BookOpen size={24} />} title="Escolha sua primeira jornada" tone="info" className="brand-spark-card mt-8"><p>Veja as jornadas disponíveis e comece pela que mais combina com o seu momento.</p><ButtonLink href="/empreendedor/jornadas" className="mt-4">Explorar jornadas</ButtonLink></EmptyState> : (
        <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]" aria-label="Continue de onde parou">
          <article className="brand-hero animate-in relative overflow-hidden rounded-card p-7 text-white shadow-lg sm:p-9" aria-labelledby="proxima-acao-titulo"><div className="relative z-10 max-w-2xl"><span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">Continue de onde parou</span><h2 id="proxima-acao-titulo" className="display-font mt-6 text-4xl leading-none sm:text-5xl">{participantNextActionLabel(nextJourney)}</h2><p className="mt-5 max-w-xl leading-7 text-white/80">{nextJourney.journey_description ?? participantCurrentStageLabel(nextJourney)}</p><div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/90"><StatusPill tone="expressive" className="!bg-white/15 !text-white">{statusLabel(nextJourney.journey_status)}</StatusPill><span>{nextJourney.completed_required_steps} de {nextJourney.total_required_steps} {participantCopy.journeys.completedProgressLabel}</span></div><div className="mt-8">{nextJourney.journey_status === "completed" ? <ButtonLink href={participantNextHref(nextJourney)} variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>{participantNextActionLabel(nextJourney)}</ButtonLink> : <form action={continueJourneyAction}><input type="hidden" name="journey_instance_id" value={nextJourney.journey_instance_id} /><input type="hidden" name="aggregate_version" value={nextJourney.journey_aggregate_version} /><input type="hidden" name="idempotency_key" value={randomUUID()} /><PendingSubmitButton pendingLabel="Abrindo jornada…" variant="secondary" size="lg" icon={<Play size={17} fill="currentColor" />}>{participantNextActionLabel(nextJourney)}</PendingSubmitButton></form>}</div></div></article>
          <article className="brand-points-card rounded-card p-6 shadow-md"><Trophy aria-hidden="true" /><p className="display-font mt-6 text-5xl text-secondary">{totalPoints}</p><h2 className="mt-3 text-xl font-black text-secondary">Pontos de evolução</h2><p className="mt-2 text-sm text-secondary/70">Atividades e verificações concluídas tornam seu avanço visível na plataforma.</p><Link href="/empreendedor/recompensas?tab=como-conseguir-pontos" className="mt-5 inline-flex text-sm font-bold text-primary hover:underline">Entender como ganhar pontos</Link></article>
        </section>
      )}

      {diagnosticPending ? <Card className="mt-8 border-primary/25 bg-primary-soft/45"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-primary">Uma forma de personalizar</p><h2 className="mt-1 text-xl font-black text-secondary">Conheça seu perfil empreendedor</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">O diagnóstico tem 12 perguntas, exibidas uma por vez, e ajuda a organizar recomendações. Ele é opcional e não impede o acesso às jornadas abertas.</p></div><div className="flex shrink-0 flex-wrap gap-2"><form action={startProfileDiagnosticAction}><PendingSubmitButton pendingLabel="Abrindo diagnóstico…" disabled={diagnosticUnavailable}>{diagnosticUnavailable ? "Diagnóstico indisponível" : diagnosticEntry?.status === "in_progress" ? "Continuar diagnóstico" : "Fazer diagnóstico"}</PendingSubmitButton></form><ButtonLink href="/empreendedor/jornadas" variant="secondary">Explorar jornadas</ButtonLink></div></div></Card> : null}

      <section className="mt-10 grid gap-4" aria-labelledby="jornadas-disponiveis-titulo"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="brand-kicker">Próximos caminhos</p><h2 id="jornadas-disponiveis-titulo" className="display-font mt-1 text-2xl text-secondary">Jornadas disponíveis para você</h2></div><Link href="/empreendedor/jornadas" className="text-sm font-bold text-primary hover:underline">Ver catálogo completo</Link></div>{availableJourneys.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{availableJourneys.map((journey, index) => { const tone = ["journey-card-cyan", "journey-card-green", "journey-card-magenta"][index % 3]; const featured = journey.presentation?.featured === true; return <Card key={journey.journey_version_id} className={`brand-journey-card ${tone} flex flex-col ${featured ? "ring-2 ring-primary/20" : ""}`}><span className="mb-3 grid size-11 place-items-center rounded-2xl bg-primary text-white shadow-md">{journey.presentation?.icon === "rocket" ? <Rocket size={21} /> : <Sparkles size={21} />}</span><StatusPill tone={featured ? "expressive" : journey.open_to_all ? "neutral" : "info"}>{featured ? (typeof journey.presentation?.eyebrow === "string" ? journey.presentation.eyebrow : "Em destaque") : journey.open_to_all ? participantCopy.journeys.openBadge : "Indicada para seu perfil"}</StatusPill><h3 className="mt-3 font-black text-secondary">{journey.title}</h3>{journey.description ? <p className="mt-2 text-sm leading-6 text-muted">{journey.description}</p> : null}<Link href="/empreendedor/jornadas" className="mt-auto pt-5 text-sm font-bold text-primary hover:underline">Ver detalhes e entrar</Link></Card>; })}</div> : <p className="rounded-card border border-border bg-white/85 p-5 text-sm text-muted shadow-sm">Você já entrou em todas as jornadas disponíveis no momento.</p>}</section>

      <section className="brand-recognition-strip mt-8 grid gap-5" aria-labelledby="recompensas-resumo-titulo">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="brand-kicker">Reconhecimento do seu avanço</p><h2 id="recompensas-resumo-titulo" className="display-font mt-1 text-2xl text-secondary">O que você pode ganhar</h2><p className="mt-2 text-sm text-muted">Veja os selos e certificados ainda disponíveis e quais aprendizados podem levá-lo até eles.</p></div><div className="flex flex-wrap gap-4"><Link href="/empreendedor/recompensas" className="text-sm font-bold text-primary hover:underline">Abrir recompensas</Link><Link href="/empreendedor/conquistas" className="text-sm font-bold text-primary hover:underline">Ver critérios e conquistas</Link></div></div>
        {recognitionItems.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{recognitionItems.slice(0, featuredBadges?.max_items ?? 3).map((reward) => <article key={`${reward.type}-${reward.version_id}`} className="brand-float-card rounded-2xl border border-accent-gold/45 bg-white p-4 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-warning-soft text-warning">{reward.type === "certificate" ? <Award size={20} /> : <Sparkles size={20} />}</span><p className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-warning">{reward.type === "certificate" ? "Certificado" : "Selo"}</p><h3 className="mt-1 font-black text-secondary">{reward.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{reward.description}</p></article>)}</div> : <div className="flex items-start gap-3 rounded-2xl bg-white p-4"><CheckCircle2 className="mt-0.5 text-success" size={21} /><div><p className="font-bold text-secondary">Você conquistou todos os reconhecimentos disponíveis</p><p className="mt-1 text-sm text-muted">Hoje você possui {credentialCount} {credentialCount === 1 ? "credencial" : "credenciais"}. Novos reconhecimentos aparecerão aqui quando forem publicados.</p></div></div>}
      </section>
    </div>
  );
}
