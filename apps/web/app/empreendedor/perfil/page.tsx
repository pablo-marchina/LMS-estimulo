import { Compass, Mail, Star, Trophy, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth/context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export const dynamic = "force-dynamic";

export default async function ParticipantProfilePage() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return null;

  const [engagement, credentials, journeys] = await Promise.all([
    engagementRuntime.participantHub(auth.identity.user_account_id).catch(() => null),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => ({ entrepreneur_id: null, badges: [], certificates: [] })),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id).catch(() => ({ actor_user_account_id: auth.identity.user_account_id, entrepreneur_id: null, journeys: [] })),
  ]);
  const preferredName = engagement?.preferred_name ?? auth.email.split("@")[0];
  const archetype = engagement?.archetype ?? null;
  const pendingDiagnostic = journeys.journeys.find((journey) => journey.d?.status !== "completed") ?? null;
  const completedJourneyCount = journeys.journeys.filter((journey) => journey.journey_status === "completed").length;
  const credentialCount = credentials.badges.length + credentials.certificates.length;
  const points = engagement?.own_rank?.points ?? 0;

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 lg:px-9 lg:py-10">
      <PageHeader eyebrow="Minha conta" title="Perfil" description="Seus dados, momento empreendedor e evolução na plataforma." />

      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="brand-accent-card">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-brand-green text-secondary"><UserRound size={26} /></div>
            <div><h2 className="font-bold text-ink">{preferredName}</h2><p className="text-sm text-muted">Empreendedor(a)</p></div>
          </div>
          <dl className="mt-6 grid gap-4 text-sm">
            <div className="flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-primary" /><div><dt className="font-medium text-muted">E-mail</dt><dd className="text-ink">{auth.email}</dd></div></div>
          </dl>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric icon={<Star size={20} />} value={points} label="Pontos" />
          <Metric icon={<Compass size={20} />} value={completedJourneyCount} label={completedJourneyCount === 1 ? "Jornada concluída" : "Jornadas concluídas"} />
          <Metric icon={<Trophy size={20} />} value={credentialCount} label={credentialCount === 1 ? "Conquista" : "Conquistas"} href="/empreendedor/conquistas" />
        </div>
      </section>

      <section aria-labelledby="diagnostico-perfil-titulo">
        <div className="mb-4"><p className="text-sm font-semibold text-muted">Seu momento</p><h2 id="diagnostico-perfil-titulo" className="display-font mt-1 text-2xl text-secondary">Diagnóstico empreendedor</h2></div>
        {archetype ? (
          <Card className="brand-accent-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-muted">Seu arquétipo atual</p><p className="display-font mt-1 text-3xl text-primary">{archetype.name ?? "Perfil identificado"}</p></div>
              <Compass size={32} className="text-brand-magenta" aria-hidden="true" />
            </div>
            {archetype.description ? <p className="mt-5 text-sm leading-6 text-muted">{archetype.description}</p> : null}
            <p className="mt-3 text-xs text-muted">O diagnóstico orienta recomendações e pode ser atualizado quando uma nova avaliação estiver disponível.</p>
          </Card>
        ) : (
          <EmptyState icon={<Compass size={24} />} title="Faça seu diagnóstico" tone="info">
            <p>Responda ao formulário para conhecer seu perfil empreendedor e receber uma experiência mais orientada.</p>
            <ButtonLink href={pendingDiagnostic ? `/empreendedor/diagnostico?journey=${pendingDiagnostic.journey_instance_id}` : "/empreendedor/jornadas"} className="mt-4">
              {pendingDiagnostic ? "Responder diagnóstico agora" : "Escolher uma jornada para começar"}
            </ButtonLink>
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function Metric({ icon, value, label, href }: { icon: React.ReactNode; value: number; label: string; href?: string }) {
  const content = <><div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div><p className="display-font mt-5 text-3xl text-secondary">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></>;
  return <Card className="brand-accent-card">{href ? <a href={href} className="block">{content}</a> : content}</Card>;
}
