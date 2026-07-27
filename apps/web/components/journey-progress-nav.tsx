import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDot, Clock3, Flag, PlayCircle } from "lucide-react";
import type { JourneyState } from "@/lib/journey-runtime/contracts";

export type JourneyStage = "diagnostic" | "activity" | "result";

type Props = {
  state: JourneyState;
  current: JourneyStage;
  activityTitle?: string;
  estimatedMinutes?: number;
};

const statusCopy: Record<string, string> = {
  available: "Disponível para começar",
  in_progress: "Atividade em andamento",
  completed: "Atividade concluída",
};

export function JourneyProgressNav({ state, current, activityTitle, estimatedMinutes }: Props) {
  const stepStatus = state.s?.status ?? "available";
  const title = current === "activity" ? activityTitle ?? "Atividade da jornada" : current === "result" ? "Resultado da jornada" : "Conheça seu perfil";
  const Icon = current === "activity" ? PlayCircle : current === "result" ? Flag : CircleDot;
  return (
    <aside className="no-print brand-activity-context relative mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-white p-4 shadow-sm" aria-label={`Contexto de ${title}`}>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="brand-button inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada
        </Link>
        <div className="grid size-11 place-items-center rounded-2xl bg-primary text-white shadow-sm"><Icon size={20} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.13em] text-primary/70">{state.journey_title ?? state.journey_code}</p>
          <p className="mt-1 truncate text-base font-black text-secondary">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current === "activity" && estimatedMinutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-xs font-bold text-info"><Clock3 size={14} /> {estimatedMinutes} min</span> : null}
          {current === "activity" ? <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${stepStatus === "completed" ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>{stepStatus === "completed" ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}{statusCopy[stepStatus] ?? "Atividade disponível"}</span> : null}
        </div>
      </div>
    </aside>
  );
}