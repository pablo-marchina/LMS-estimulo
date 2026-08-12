import Link from "next/link";
import { ClipboardList, Compass, Sparkles, Target } from "lucide-react";
import { DiagnosticResultDashboard } from "@/components/diagnostic-result-dashboard";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { StatusPanel } from "@/components/status-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { participantDiagnosticRuntime } from "@/lib/diagnostics/participant-runtime";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { extensionsRuntime, type JsonRecord } from "@/lib/extensions/runtime";
import { saveApplicationObjectiveAction, startProfileDiagnosticAction } from "../actions";

export const dynamic = "force-dynamic";
function fulfilled<T>(result: PromiseSettledResult<T>): T | null { return result.status === "fulfilled" ? result.value : null; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default async function ParticipantProfileDiagnosticPage({ searchParams }: { searchParams: Promise<{ erro?: string; diagnostico?: string; sucesso?: string; referencia?: string }> }) {
  const query = await searchParams;
  const auth = await requireParticipantContext();
  const results = await Promise.allSettled([
    engagementRuntime.participantHub(auth.identity.user_account_id),
    engagementRuntime.participantDiagnosticSummary(auth.identity.user_account_id),
    participantDiagnosticRuntime.resolveEntry(auth.identity.user_account_id),
    extensionsRuntime.participantWorkspace(auth.identity.user_account_id),
    engagementRuntime.participantProfileSummary(auth.identity.user_account_id),
  ] as const);
  const engagement = fulfilled(results[0]);
  const diagnosticSummary = fulfilled(results[1]);
  const diagnosticEntry = fulfilled(results[2]);
  const extensions = fulfilled(results[3]);
  const profileSummary = fulfilled(results[4]);
  const archetype = engagement?.archetype ?? null;
  const diagnosticUnavailable = diagnosticEntry?.status === "not_configured";

  return <div className="grid gap-8">
    {results.some((result) => result.status === "rejected") ? <StatusPanel title="Algumas informações não puderam ser atualizadas" tone="warning">Seus diagnósticos continuam salvos. Recarregue a página para tentar novamente.</StatusPanel> : null}
    {query.erro === "diagnostico_indisponivel" ? <StatusPanel title="Não foi possível abrir o diagnóstico" tone="warning">Tente novamente. Se o problema continuar, use a área de Jornadas.</StatusPanel> : null}
    {query.erro === "diagnostico_nao_configurado" ? <StatusPanel title="Diagnóstico temporariamente indisponível" tone="warning">A equipe ainda está preparando a versão ativa do diagnóstico.</StatusPanel> : null}
    {query.erro === "objetivo_invalido" ? <StatusPanel title="Revise o objetivo" tone="warning">Escreva entre 5 e 500 caracteres.</StatusPanel> : null}
    {query.erro === "objetivo_indisponivel" ? <StatusPanel title="Objetivo não salvo" tone="warning"><p>Nenhuma alteração foi perdida. Tente novamente.</p>{query.referencia ? <p className="mt-2 text-xs">Referência do erro: {query.referencia}</p> : null}</StatusPanel> : null}
    {query.sucesso === "objetivo_salvo" ? <StatusPanel title="Objetivo definido" tone="success">Seu objetivo foi salvo. Os 50 pontos são concedidos uma única vez.</StatusPanel> : null}
    {query.diagnostico === "concluido" ? <StatusPanel title="Diagnóstico opcional concluído" tone="success">O resultado foi salvo sem alterar seu arquétipo ou o acesso às jornadas.</StatusPanel> : null}

    <section aria-labelledby="diagnostico-perfil-titulo">
      <div className="mb-4"><p className="brand-kicker">Seu momento</p><h2 id="diagnostico-perfil-titulo" className="display-font mt-1 text-2xl text-secondary">Um olhar mais de perto</h2></div>
      {archetype ? <DiagnosticResultDashboard archetype={archetype} dimensions={diagnosticSummary?.dimensions ?? []} /> : <EmptyState icon={<Compass size={24} />} title="Descubra seu perfil empreendedor" tone="info" className="brand-spark-card"><p>Responda as perguntas quando desejar. Seu progresso fica salvo durante a sessão.</p><form action={startProfileDiagnosticAction} className="mt-4"><PendingSubmitButton pendingLabel="Abrindo diagnóstico…" size="lg" icon={<Sparkles size={17} />} disabled={diagnosticUnavailable}>{diagnosticUnavailable ? "Diagnóstico indisponível" : diagnosticEntry?.status === "in_progress" ? "Continuar diagnóstico" : "Fazer diagnóstico agora"}</PendingSubmitButton></form></EmptyState>}
    </section>

    {archetype ? <section aria-labelledby="objetivo-aplicacao-titulo"><div className="mb-4"><p className="brand-kicker">Próximo passo</p><h2 id="objetivo-aplicacao-titulo" className="display-font mt-1 text-2xl text-secondary">Seu objetivo de aplicação</h2></div><Card><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Target size={20} /></span><div><h3 className="font-semibold text-ink">O que você quer desenvolver a partir do seu diagnóstico?</h3><p className="mt-1 text-sm text-muted">Defina um caso de uso real do negócio. A primeira definição concede 50 pontos; alterações futuras atualizam o objetivo sem duplicar pontos.</p></div></div><form action={saveApplicationObjectiveAction} className="mt-5 grid gap-3"><Textarea name="application_objective" minLength={5} maxLength={500} rows={4} defaultValue={profileSummary?.application_objective ?? ""} placeholder="Ex.: melhorar meu processo de vendas e acompanhar propostas com mais clareza." required /><PendingSubmitButton pendingLabel="Salvando objetivo…" className="w-fit">Salvar objetivo</PendingSubmitButton></form></Card></section> : null}

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
