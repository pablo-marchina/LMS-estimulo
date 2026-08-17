import { Compass, Mail, Star, Trophy, UserRound } from "lucide-react";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export const dynamic = "force-dynamic";
function fulfilled<T>(result: PromiseSettledResult<T>): T | null { return result.status === "fulfilled" ? result.value : null; }

export default async function ParticipantProfilePage() {
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    credentialRuntime.listParticipant(auth.identity.user_account_id),
    journeyRuntime.listParticipantJourneys(auth.identity.user_account_id),
  ] as const);
  const engagement = fulfilled(results[0]);
  const credentials = fulfilled(results[1]);
  const journeys = fulfilled(results[2]);
  const preferredName = engagement?.preferred_name ?? auth.email.split("@")[0];
  const completedJourneyCount = journeys?.journeys.filter((journey) => journey.journey_status === "completed").length ?? 0;
  const credentialCount = (credentials?.badges.length ?? 0) + (credentials?.certificates.length ?? 0);
  const points = engagement?.own_rank?.points ?? 0;

  return <div className="grid gap-8">
    {results.some((result) => result.status === "rejected") ? <StatusPanel title="Algumas informações não puderam ser atualizadas" tone="warning">Seus dados continuam salvos. Recarregue a página para tentar novamente.</StatusPanel> : null}

    <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <Card className="brand-accent-card after:!hidden"><div className="flex items-center gap-4"><div className="grid size-14 place-items-center rounded-full bg-brand-green text-secondary shadow-md"><UserRound size={26} /></div><div><h2 className="font-bold text-ink">{preferredName}</h2><p className="text-sm text-muted">Empreendedor(a)</p></div></div><dl className="mt-6 grid gap-4 text-sm"><div className="flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-primary" /><div><dt className="font-medium text-muted">E-mail</dt><dd className="text-ink">{auth.email}</dd></div></div></dl></Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric icon={<Star size={20} />} value={points} label="Pontos acumulados" tone="cyan" /><Metric icon={<Compass size={20} />} value={completedJourneyCount} label={completedJourneyCount === 1 ? "Jornada concluída" : "Jornadas concluídas"} tone="green" /><Metric icon={<Trophy size={20} />} value={credentialCount} label={credentialCount === 1 ? "Conquista" : "Conquistas"} href="/empreendedor/conquistas" tone="magenta" /></div>
    </section>
  </div>;
}

function Metric({ icon, value, label, href, tone }: { icon: React.ReactNode; value: number; label: string; href?: string; tone: "cyan" | "green" | "magenta" }) {
  const toneClass = tone === "cyan" ? "metric-cyan" : tone === "green" ? "metric-green" : "metric-magenta";
  const content = <><div className="grid size-10 place-items-center rounded-xl bg-white/80 text-primary shadow-sm">{icon}</div><p className="display-font mt-5 text-3xl text-secondary">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></>;
  return <Card className={`brand-metric-card ${toneClass}`}>{href ? <a href={href} className="block">{content}</a> : content}</Card>;
}
