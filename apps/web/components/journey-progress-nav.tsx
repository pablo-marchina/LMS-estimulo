import Link from "next/link";
import { Check } from "lucide-react";
import type { JourneyState } from "@/lib/journey-runtime/contracts";
import { cn } from "@/lib/utils";

export type JourneyStage = "diagnostic" | "activity" | "result";
type JourneyStageState = "complete" | "current" | "locked";

function stageState(state: JourneyState, stage: JourneyStage): JourneyStageState {
  if (stage === "diagnostic") {
    if (state.d?.status === "completed") return "complete";
    return "current";
  }
  if (stage === "activity") {
    if (!state.d || state.d.status !== "completed") return "locked";
    if (state.q?.passed || state.journey_status === "completed") return "complete";
    return "current";
  }
  if (state.journey_status === "completed") return "complete";
  if (state.q?.passed) return "current";
  return "locked";
}

function stageHref(state: JourneyState, stage: JourneyStage): string | null {
  const query = `?journey=${encodeURIComponent(state.journey_instance_id)}`;
  if (stage === "diagnostic") return `/empreendedor/diagnostico${query}`;
  if (stage === "activity" && state.s) return `/empreendedor/atividade/${state.s.step_instance_id}${query}`;
  if (stage === "result" && (state.q?.passed || state.journey_status === "completed")) return `/empreendedor/resultado${query}`;
  return null;
}

const labels: Record<JourneyStage, string> = {
  diagnostic: "Diagnóstico",
  activity: "Aprendizagem",
  result: "Resultado"
};

export function JourneyProgressNav({ state, current }: { state: JourneyState; current: JourneyStage }) {
  const stages: JourneyStage[] = ["diagnostic", "activity", "result"];
  return (
    <nav
      className="no-print mb-6 flex items-center gap-4 overflow-x-auto rounded-xl border border-border bg-surface p-3 shadow-xs"
      aria-label={`Etapas de ${state.journey_title ?? state.journey_code}`}
    >
      <Link href="/empreendedor" className="shrink-0 text-sm font-semibold text-primary hover:underline">
        Painel
      </Link>
      <ol className="flex flex-1 items-stretch gap-2">
        {stages.map((stage, index) => {
          const status = stageState(state, stage);
          const href = stageHref(state, stage);
          const isActive = current === stage;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  status === "complete" ? "bg-success-soft text-success" : status === "current" ? "bg-primary text-white" : "bg-surface-muted text-muted"
                )}
              >
                {status === "complete" ? <Check size={14} /> : index + 1}
              </span>
              <span className="text-sm font-semibold">{labels[stage]}</span>
            </>
          );
          const shared = cn(
            "flex flex-1 items-center gap-2 rounded-lg border border-transparent px-3 py-2 whitespace-nowrap",
            status === "locked" && "opacity-50",
            isActive && "border-border-strong bg-surface-muted"
          );
          return (
            <li key={stage} className="flex-1">
              {href ? (
                <Link className={shared} href={href} aria-current={isActive ? "step" : undefined}>
                  {content}
                </Link>
              ) : (
                <span className={shared} aria-disabled="true">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
