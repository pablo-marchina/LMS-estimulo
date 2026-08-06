import { Compass, Mail, Star, Target, Trophy, UserRound } from "lucide-react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { saveApplicationObjectiveAction } from "./actions";

export const dynamic = "force-dynamic";
function fulfilled<T>(result: PromiseSettledResult<T>): T | null { return result.status === "fulfilled" ? result.value : null; }

export default async function ParticipantProfilePage({ searchParams }: { searchParams: Promise<{ erro?: string; sucesso?: string; referencia?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
    engagementRuntime.participantProfileSummary(auth.identity.user_account_id),
  ] as const);
  const engagement = fulfilled(results[0]);
  const credentials = fulfilled(results[1]);
  const journeys = fulfilled(results[2]);
  const profileSummary = fulfilled(results[3]);
  const preferredName = engagement?.preferred_name ?? auth.email.split("@")[0];
  const completedJourneyCount = journeys?.journeys.filter((journey) => journey.journey_status === "completed").length ?? 0;
  const credentialCount = (credentials?.badges.length ?? 0) + (credentials?.certificates.length ?? 0);
  const points = engagement?.own_rank?.points ?? 0;

  return <div className="grid gap-8">
    {results.some((result) => result.status === "rejected") ? <StatusPanel title="Algumas informações não puderam ser atualizadas" tone="warning">Seus dados continuam salvos. Recarregue a página para tentar novamente.</StatusPanel> : null}
    {query.erro === "objetivo_invalido" ? <StatusPanel title="Revise o objetivo" tone="warning">Escreva entre 5 e 500 caracteres.</StatusPanel> : null}
    {query.erro === "objetivo_indisponivel" ? <StatusPanel title="Objetivo não salvo" tone="warning"><p>Nenhuma alteração foi perdida. Tente novamente em instantes.</p>{query.referencia ? <p className="mt-2 text-xs">Referência do erro: {query.referencia}</p> : null}</StatusPanel> : null}
    {query.sucesso === "objetivo_salvo" ? <StatusPanel title="Objetivo definido" tone="success">Seu objetivo foi salvo. Os 50 pontos são concedidos uma única vez.</StatusPanel> : null}

    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <Card className="brand-accent-card after:!hidden"><div className="flex items-center gap-4"><div className="grid size-14 place-items-center rounded-full bg-brand-green text-secondary shadow-md"><UserRound size={26} /></div><div><h2 className="font-bold text-ink">{preferredName}</h2><p className="text-sm text-muted">Empreendedor(a)</p></div></div><dl className="mt-6 grid gap-4 text-sm"><div className="flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-primary" /><div><dt className="font-medium text-muted">E-mail</dt><dd className="text-ink">{auth.email}</dd></div></div></dl></Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric icon={<Star size={20} />} value={points} label="Pontos" tone="cyan" /><Metric icon={<Compass size={20} />} value={completedJourneyCount} label={completedJourneyCount === 1 ? "Jornada concluída" : "Jornadas concluídas"} tone="green" /><Metric icon={<Trophy size={20} />} value={credentialCount} label={credentialCount === 1 ? "Conquista" : "Conquistas"} href="/empreendedor/conquistas" tone="magenta" /></div>
    </section>

    <section aria-labelledby="objetivo-aplicacao-titulo"><div className="mb-4"><p className="brand-kicker">Aplicação prática</p><h2 id="objetivo-aplicacao-titulo" className="display-font mt-1 text-2xl text-secondary">Seu objetivo de aplicação</h2></div><Card><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Target size={20} /></span><div><h3 className="font-semibold text-ink">O que você quer desenvolver com o aprendizado?</h3><p className="mt-1 text-sm text-muted">Defina um caso de uso real do negócio. A primeira definição concede 50 pontos; alterações futuras atualizam o objetivo sem duplicar pontos.</p></div></div><form action={saveApplicationObjectiveAction} className="mt-5 grid gap-3"><Textarea name="application_objective" minLength={5} maxLength={500} rows={4} defaultValue={profileSummary?.application_objective ?? ""} placeholder="Ex.: criar um processo de atendimento com IA para responder clientes mais rápido e acompanhar propostas." required /><PendingSubmitButton pendingLabel="Salvando objetivo…" className="w-fit">Salvar objetivo</PendingSubmitButton></form></Card></section>
  </div>;
}

function Metric({ icon, value, label, href, tone }: { icon: React.ReactNode; value: number; label: string; href?: string; tone: "cyan" | "green" | "magenta" }) {
  const toneClass = tone === "cyan" ? "metric-cyan" : tone === "green" ? "metric-green" : "metric-magenta";
  const content = <><div className="grid size-10 place-items-center rounded-xl bg-white/80 text-primary shadow-sm">{icon}</div><p className="display-font mt-5 text-3xl text-secondary">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></>;
  return <Card className={`brand-metric-card ${toneClass}`}>{href ? <a href={href} className="block">{content}</a> : content}</Card>;
}
