import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDot, Clock3, Flag, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getAuthContext } from "@/lib/auth/context";
import { displayContentName } from "@/lib/content/display-name";
import type { JourneyState } from "@/lib/journey-runtime/contracts";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";

export type JourneyStage = "diagnostic" | "activity" | "result";

type Props = { state: JourneyState; current: JourneyStage; activityTitle?: string; estimatedMinutes?: number };

const statusCopy: Record<string, string> = { available: "Disponível para começar", in_progress: "Atividade em andamento", completed: "Atividade concluída" };
const stageOrder: JourneyStage[] = ["diagnostic", "activity", "result"];
const stageCopy: Record<JourneyStage, { label: string; description: string }> = {
  diagnostic: { label: "Diagnóstico", description: "Entenda seu momento" },
  activity: { label: "Jornada", description: "Aprenda e coloque em prática" },
  result: { label: "Resultado", description: "Acompanhe sua evolução" },
};

export async function JourneyProgressNav({ state, current, activityTitle, estimatedMinutes }: Props) {
  const stepStatus = state.s?.status ?? "available";
  const title = current === "activity" ? activityTitle ?? "Atividade da jornada" : current === "result" ? "Resultado da jornada" : "Conheça seu perfil";
  const Icon = current === "activity" ? PlayCircle : current === "result" ? Flag : CircleDot;
  const currentStageIndex = stageOrder.indexOf(current);
  const auth = await getAuthContext();
  const outline = auth.status === "authenticated" ? await getParticipantJourneyOutline(auth.identity.user_account_id, state.journey_instance_id).catch(() => null) : null;
  const journeyLabel = displayContentName(outline?.journey_title ?? state.journey_title, displayContentName(state.journey_code, "Jornada"));
  const journeyPercent = outline ? Math.round(Math.max(0, Math.min(1, outline.progress)) * 100) : null;
  const focusCopy = stepStatus === "completed" ? "Aula concluída. Use a navegação principal no fim da aula para seguir em frente." : "Conclua o conteúdo e as etapas obrigatórias desta aula. Seu progresso é salvo automaticamente.";

  return <aside className="no-print brand-activity-context relative mb-0 overflow-hidden rounded-2xl border border-primary/15 bg-white p-4 shadow-sm" aria-label={`Contexto de ${title}`}>
    <div className="flex flex-wrap items-center gap-3">
      {current !== "activity" ? <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="brand-button inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white"><ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada</Link> : null}
      <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-sm"><Icon size={19} aria-hidden="true" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold uppercase tracking-[.13em] text-primary/70">{journeyLabel}</p><p className="mt-0.5 truncate text-base font-black text-secondary">{title}</p></div>
      <div className="flex flex-wrap items-center gap-2">{current === "activity" && estimatedMinutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-xs font-bold text-info"><Clock3 size={14} /> {estimatedMinutes} min</span> : null}{current === "activity" ? <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${stepStatus === "completed" ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>{stepStatus === "completed" ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}{statusCopy[stepStatus] ?? "Atividade disponível"}</span> : null}</div>
    </div>
    {current === "activity" && outline && journeyPercent !== null ? <div className="mt-4 grid gap-3 border-t border-border pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.48fr)]"><section className="rounded-xl bg-surface-muted/65 p-3.5" aria-label="Progresso geral da jornada"><div className="flex items-center justify-between gap-3 text-xs font-bold text-secondary"><span>Progresso da jornada</span><strong className="text-primary">{journeyPercent}%</strong></div><Progress value={journeyPercent} tone="success" className="mt-2.5" /><p className="mt-2 text-xs leading-5 text-muted">{outline.completed_required_steps} de {outline.total_required_steps} atividades obrigatórias concluídas.</p></section><section className={`rounded-xl border p-3.5 ${stepStatus === "completed" ? "border-success/20 bg-success-soft/55" : "border-primary/15 bg-primary-soft/45"}`} aria-label="Foco atual"><p className={`text-[11px] font-black uppercase tracking-[.13em] ${stepStatus === "completed" ? "text-success" : "text-primary"}`}>Foco agora</p><p className="mt-1 text-sm font-semibold leading-5 text-secondary">{focusCopy}</p></section></div> : null}
    {current !== "activity" ? <ol className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3" aria-label="Etapas da experiência">{stageOrder.map((stage, index) => { const completed = index < currentStageIndex || (stage === "result" && current === "result"); const active = stage === current; const copy = stageCopy[stage]; return <li key={stage} aria-current={active ? "step" : undefined} className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${active ? "border-primary/30 bg-primary-soft" : completed ? "border-success/20 bg-success-soft/60" : "border-border bg-surface-muted/40"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${active ? "bg-primary text-white" : completed ? "bg-success text-white" : "bg-white text-muted ring-1 ring-border"}`}>{completed ? <CheckCircle2 size={17} aria-hidden="true" /> : index + 1}</span><span className="min-w-0"><strong className={`block text-sm ${active ? "text-primary" : "text-secondary"}`}>{copy.label}</strong><small className="block truncate text-xs text-muted">{copy.description}</small></span></li> })}</ol> : null}
  </aside>;
}
