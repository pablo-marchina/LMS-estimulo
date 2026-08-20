import type { JourneyState } from "@/lib/journey-runtime/contracts";

export function participantNextHref(state: JourneyState): string {
  return `/empreendedor/jornada/${encodeURIComponent(state.journey_instance_id)}`;
}

export function participantNextActionLabel(state: JourneyState): string {
  if (state.journey_status === "completed") return "Rever jornada";
  if (state.journey_status === "available") return "Começar jornada";
  if (state.s) return "Abrir trilha";
  return "Continuar jornada";
}

export function participantCurrentStageLabel(state: JourneyState): string {
  if (state.journey_status === "completed") return "Jornada concluída";
  if (state.q?.passed) return "Conclusão da jornada";
  if (state.s) return "Atividades da trilha disponíveis";
  return "Jornada pronta para começar";
}

export function participantJourneyPriority(state: JourneyState): number {
  if (state.journey_status === "in_progress") return 0;
  if (state.journey_status === "available") return 1;
  if (state.journey_status === "failed") return 2;
  if (state.journey_status === "completed") return 3;
  return 4;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Disponível",
    in_progress: "Em andamento",
    completed: "Concluída",
    failed: "Revisão necessária",
    passed: "Aprovada",
    active: "Ativa",
    locked: "Bloqueada",
    skipped: "Ignorada",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}
