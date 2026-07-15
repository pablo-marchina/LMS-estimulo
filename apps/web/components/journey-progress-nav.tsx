import Link from "next/link";
import type { JourneyState } from "@/lib/journey-runtime/contracts";

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

const stateClassNames: Record<JourneyStageState, string> = {
  complete: "journey-progress-step--complete",
  current: "journey-progress-step--current",
  locked: "journey-progress-step--locked"
};

export function JourneyProgressNav({ state, current }: { state: JourneyState; current: JourneyStage }) {
  const stages: JourneyStage[] = ["diagnostic", "activity", "result"];
  return (
    <nav className="journey-progress-nav no-print" aria-label={`Etapas de ${state.journey_title ?? state.journey_code}`}>
      <Link className="journey-progress-home" href="/empreendedor">Painel</Link>
      <ol>
        {stages.map((stage, index) => {
          const status = stageState(state, stage);
          const href = stageHref(state, stage);
          const className = `journey-progress-step ${stateClassNames[status]}${current === stage ? " journey-progress-step--active" : ""}`;
          const content = <><span aria-hidden="true">{status === "complete" ? "✓" : index + 1}</span><strong>{labels[stage]}</strong></>;
          return <li key={stage}>{href ? <Link className={className} href={href} aria-current={current === stage ? "step" : undefined}>{content}</Link> : <span className={className} aria-disabled="true">{content}</span>}</li>;
        })}
      </ol>
    </nav>
  );
}
