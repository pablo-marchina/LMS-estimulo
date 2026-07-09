import type { JourneyState } from "@/lib/e14/contracts";

export function participantNextHref(state: JourneyState): string {
  const query = `?journey=${encodeURIComponent(state.journey_instance_id)}`;
  if (state.journey_status === "completed") return `/empreendedor/resultado${query}`;
  if (!state.d || state.d.status !== "completed") return `/empreendedor/diagnostico${query}`;
  if (state.s) return `/empreendedor/atividade/${state.s.step_instance_id}${query}`;
  return `/empreendedor/resultado${query}`;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "Disponível",
    in_progress: "Em andamento",
    completed: "Concluída",
    failed: "Revisão necessária",
    passed: "Aprovada",
    active: "Ativa"
  };
  return labels[status] ?? status.replaceAll("_", " ");
}
