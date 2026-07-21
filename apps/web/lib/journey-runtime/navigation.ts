import type { JourneyState } from "@/lib/journey-runtime/contracts";

export function participantNextHref(state: JourneyState): string {
  const query = `?journey=${encodeURIComponent(state.journey_instance_id)}`;
  if (state.journey_status === "completed") return `/empreendedor/resultado${query}`;
  if (!state.d || state.d.status !== "completed") return `/empreendedor/diagnostico${query}`;
  if (state.s) return `/empreendedor/jornada/${encodeURIComponent(state.journey_instance_id)}`;
  return `/empreendedor/resultado${query}`;
}

export function participantNextActionLabel(state: JourneyState): string {
  if (state.journey_status === "completed") return "Rever resultado";
  if (state.journey_status === "available") return "Começar jornada";
  if (!state.d || state.d.status !== "completed") return "Continuar diagnóstico";
  if (state.q?.passed) return "Ver resultado";
  if (state.s) return "Abrir trilha";
  return "Continuar jornada";
}

export function participantCurrentStageLabel(state: JourneyState): string {
  if (state.journey_status === "completed") return "Resultado disponível";
  if (!state.d || state.d.status !== "completed") return "Diagnóstico inicial";
  if (state.q?.passed) return "Conclusão da jornada";
  if (state.s) return "Atividades da trilha disponíveis";
  return "Preparando próxima etapa";
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
