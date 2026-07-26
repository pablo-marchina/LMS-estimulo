import { Compass, Mail, Sparkles, Star, Target, Trophy, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { saveApplicationObjectiveAction, startProfileDiagnosticAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ParticipantProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const query = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [engagement, credentials, journeys] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id).catch(() => ({ actor_user_account_id: auth.identity.user_account_id, entrepreneur_id: null, journeys: [] })),
  ]);
  const preferredName = engagement?.preferred_name ?? auth.email.split("@")[0];
  const archetype = engagement?.archetype ?? null;
  const completedJourneyCount = journeys.journeys.filter((journey) => journey.journey_status === "completed").length;
  const credentialCount = credentials.badges.length + credentials.certificates.length;
  const points = engagement?.own_rank?.points ?? 0;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Minha conta" title="Perfil" description="Seus dados, momento empreendedor e evolução na plataforma." />

      {query.erro === "diagnostico_indisponivel" ? <StatusPanel title="Não foi possível abrir o diagnóstico" tone="warning">Tente novamente pela área de Jornadas.</StatusPanel> : null}
      {query.erro === "objetivo_invalido" ? <StatusPanel title="Revise o objetivo" tone="warning">Escreva entre 5 e 500 caracteres.</StatusPanel> : null}
      {query.erro === "objetivo_indisponivel" ? <StatusPanel title="Objetivo não salvo" tone="warning">Tente novamente em instantes.</StatusPanel> : null}
      {query.sucesso === "objetivo_salvo" ? <StatusPanel title="Objetivo definido" tone="success">Seu caso de uso foi salvo. Os 50 pontos são concedidos uma única vez.</StatusPanel> : null}

      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="brand-accent-card brand-spark-card">
          <div className="flex items-center gap-4"><div className="grid size-14 place-items-center rounded-full bg-brand-green text-secondary shadow-md"><UserRound size={26} /></div><div><h2 className="font-bold text-ink">{preferredName}</h2><p className="text-sm text-muted">Empreendedor(a)</p></div></div>
          <dl className="mt-6 grid gap-4 text-sm"><div className="flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-primary" /><div><dt className="font-medium text-muted">E-mail</dt><dd className="text-ink">{auth.email}</dd></div></div></dl>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric icon={<Star size={20} />} value={points} label="Pontos" tone="cyan" />
          <Metric icon={<Compass size={20} />} value={completedJourneyCount} label={completedJourneyCount === 1 ? "Jornada concluída" : "Jornadas concluídas"} tone="green" />
          <Metric icon={<Trophy size={20} />} value={credentialCount} label={credentialCount === 1 ? "Conquista" : "Conquistas"} href="/empreendedor/conquistas" tone="magenta" />
        </div>
      </section>

      <section aria-labelledby="objetivo-aplicacao-titulo">
        <div className="mb-4"><p className="brand-kicker">Aplicação prática</p><h2 id="objetivo-aplicacao-titulo" className="display-font mt-1 text-2xl text-secondary">Seu objetivo de aplicação</h2></div>
        <Card>
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Target size={20} /></span><div><h3 className="font-semibold text-ink">O que você quer desenvolver com o aprendizado?</h3><p className="mt-1 text-sm text-muted">Defina um caso de uso real do negócio. A primeira definição concede 50 pontos; alterações futuras atualizam o objetivo sem duplicar pontos.</p></div></div>
          <form action={saveApplicationObjectiveAction} className="mt-5 grid gap-3"><Textarea name="application_objective" minLength={5} maxLength={500} rows={4} placeholder="Ex.: criar um processo de atendimento com IA para responder clientes mais rápido e acompanhar propostas." required /><Button type="submit" className="w-fit">Salvar objetivo</Button></form>
        </Card>
      </section>

      <section aria-labelledby="diagnostico-perfil-titulo">
        <div className="mb-4"><p className="brand-kicker">Seu momento</p><h2 id="diagnostico-perfil-titulo" className="display-font mt-1 text-2xl text-secondary">Diagnóstico empreendedor</h2></div>
        {archetype ? (
          <Card className="brand-accent-card brand-spark-card"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-muted">Seu arquétipo atual</p><p className="display-font mt-1 text-3xl text-primary">{archetype.name ?? "Perfil identificado"}</p></div><Compass size={32} className="text-brand-magenta" aria-hidden="true" /></div>{archetype.description ? <p className="mt-5 text-sm leading-6 text-muted">{archetype.description}</p> : null}<p className="mt-3 text-xs text-muted">O diagnóstico é opcional, orienta recomendações e pode ser atualizado quando uma nova avaliação estiver disponível.</p></Card>
        ) : (
          <EmptyState icon={<Compass size={24} />} title="Descubra seu perfil empreendedor" tone="info" className="brand-spark-card"><p>Responda 12 perguntas quando desejar. O diagnóstico não bloqueia jornadas abertas.</p><form action={startProfileDiagnosticAction} className="mt-4"><Button type="submit" size="lg" icon={<Sparkles size={17} />}>Fazer diagnóstico agora</Button></form></EmptyState>
        )}
      </section>
    </div>
  );
}

function Metric({ icon, value, label, href, tone }: { icon: React.ReactNode; value: number; label: string; href?: string; tone: "cyan" | "green" | "magenta" }) {
  const toneClass = tone === "cyan" ? "metric-cyan" : tone === "green" ? "metric-green" : "metric-magenta";
  const content = <><div className="grid size-10 place-items-center rounded-xl bg-white/80 text-primary shadow-sm">{icon}</div><p className="display-font mt-5 text-3xl text-secondary">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></>;
  return <Card className={`brand-metric-card ${toneClass}`}>{href ? <a href={href} className="block">{content}</a> : content}</Card>;
}
