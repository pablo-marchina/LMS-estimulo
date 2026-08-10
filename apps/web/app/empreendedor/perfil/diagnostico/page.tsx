import Link from "next/link";
import { ClipboardList, Compass, Sparkles } from "lucide-react";
import { DiagnosticDimensionChart } from "@/components/diagnostic-dimension-chart";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { startProfileDiagnosticAction } from "../actions";

export const dynamic = "force-dynamic";
function fulfilled<T>(result: PromiseSettledResult<T>): T | null { return result.status === "fulfilled" ? result.value : null; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default async function ParticipantProfileDiagnosticPage({ searchParams }: { searchParams: Promise<{ erro?: string; diagnostico?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantDiagnosticSummary(auth.identity.user_account_id),
    participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id),
    extensionsRuntime.participantWorkspace(auth.identity.user_account_id),
  ] as const);
  const engagement = fulfilled(results[0]);
  const diagnosticSummary = fulfilled(results[1]);
  const diagnosticEntry = fulfilled(results[2]);
  const extensions = fulfilled(results[3]);
  const archetype = engagement?.archetype ?? null;
  const diagnosticUnavailable = diagnosticEntry?.status === "not_configured";

  return <div className="grid gap-8">
    {results.some((result) => result.status === "rejected") ? <StatusPanel title="Algumas informações não puderam ser atualizadas" tone="warning">Seus diagnósticos continuam salvos. Recarregue a página para tentar novamente.</StatusPanel> : null}
    {query.erro === "diagnostico_indisponivel" ? <StatusPanel title="Não foi possível abrir o diagnóstico" tone="warning">Tente novamente. Se o problema continuar, use a área de Jornadas.</StatusPanel> : null}
    {query.erro === "diagnostico_nao_configurado" ? <StatusPanel title="Diagnóstico temporariamente indisponível" tone="warning">A equipe ainda está preparando a versão ativa do diagnóstico.</StatusPanel> : null}
    {query.diagnostico === "concluido" ? <StatusPanel title="Diagnóstico opcional concluído" tone="success">O resultado foi salvo sem alterar seu arquétipo ou o acesso às jornadas.</StatusPanel> : null}

    <section aria-labelledby="diagnostico-perfil-titulo"><div className="mb-4"><p className="brand-kicker">Seu momento</p><h2 id="diagnostico-perfil-titulo" className="display-font mt-1 text-2xl text-secondary">Um olhar mais de perto</h2></div>{archetype ? <Card className="brand-accent-card after:!hidden"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-muted">Seu jeito de empreender</p><p className="display-font mt-1 text-3xl text-primary">{archetype.name ?? "Perfil identificado"}</p></div><Compass size={32} className="text-brand-magenta" aria-hidden="true" /></div>{archetype.description ? <p className="mt-5 text-sm leading-6 text-muted">{archetype.description}</p> : null}{diagnosticSummary?.dimensions.length ? <DiagnosticDimensionChart dimensions={diagnosticSummary.dimensions} /> : null}<p className="mt-5 text-xs text-muted">Seu resultado ajuda a personalizar sua experiência e indicar conteúdos e jornadas que fazem mais sentido para você.</p></Card> : <EmptyState icon={<Compass size={24} />} title="Descubra seu perfil empreendedor" tone="info" className="brand-spark-card"><p>Responda as perguntas quando desejar. Seu progresso fica salvo durante a sessão.</p><form action={startProfileDiagnosticAction} className="mt-4"><PendingSubmitButton pendingLabel="Abrindo diagnóstico…" size="lg" icon={<Sparkles size={17} />} disabled={diagnosticUnavailable}>{diagnosticUnavailable ? "Diagnóstico indisponível" : diagnosticEntry?.status === "in_progress" ? "Continuar diagnóstico" : "Fazer diagnóstico agora"}</PendingSubmitButton></form></EmptyState>}</section>

    <section aria-labelledby="diagnosticos-opcionais-titulo"><div className="mb-4"><p className="brand-kicker">Autoconhecimento</p><h2 id="diagnosticos-opcionais-titulo" className="display-font mt-1 text-2xl text-secondary">Diagnósticos opcionais</h2><p className="mt-1 text-sm text-muted">Você escolhe se quer fazer. Eles não alteram seu arquétipo nem o acesso às jornadas.</p></div>{!extensions?.optional_diagnostics.length ? <EmptyState icon={<ClipboardList size={22} />} title="Nenhum diagnóstico opcional disponível" tone="info">Quando uma avaliação voluntária for liberada para você, ela aparecerá aqui.</EmptyState> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{extensions.optional_diagnostics.map((diagnostic) => <OptionalDiagnosticCard key={text((diagnostic.availability as JsonRecord | undefined)?.id)} diagnostic={diagnostic} />)}</div>}</section>
  </div>;
}

function OptionalDiagnosticCard({ diagnostic }: { diagnostic: JsonRecord }) {
  const availability = diagnostic.availability as JsonRecord;
  const sessions = records(diagnostic.sessions);
  const completed = sessions.find((session) => session.status === "completed");
  const inProgress = sessions.find((session) => session.status === "in_progress");
  return <Card className="flex flex-col"><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><ClipboardList size={19} /></span>{completed ? <StatusPill tone="success">Concluído</StatusPill> : inProgress ? <StatusPill tone="info">Em andamento</StatusPill> : <StatusPill tone="neutral">Disponível</StatusPill>}</div><h3 className="mt-4 font-black text-ink">{text(availability.display_title)}</h3><p className="mt-2 flex-1 text-sm text-muted">{text(availability.display_description)}</p><p className="mt-3 text-xs text-muted">{availability.max_attempts === null ? "Tentativas ilimitadas" : `${number(availability.max_attempts)} tentativa(s)`}</p><Link href={`/empreendedor/perfil/diagnosticos/${text(availability.id)}${inProgress ? `?sessao=${text(inProgress.id)}` : ""}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:brightness-95">{inProgress ? "Continuar" : completed ? "Ver resultado ou refazer" : "Iniciar"}</Link></Card>;
}
