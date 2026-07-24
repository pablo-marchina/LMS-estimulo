import Link from "next/link";
import { ArrowLeft, CheckCircle2, Compass, FileUp, Flag } from "lucide-react";
import type { JourneyState } from "@/lib/journey-runtime/contracts";

export type JourneyStage = "diagnostic" | "activity" | "result";

const labels: Record<JourneyStage, string> = {
  diagnostic: "Diagnóstico",
  activity: "Aprendizagem",
  result: "Resultado",
};

const icons = {
  diagnostic: Compass,
  activity: FileUp,
  result: Flag,
};

export function JourneyProgressNav({ state, current }: { state: JourneyState; current: JourneyStage }) {
  const Icon = icons[current];
  const diagnosticComplete = state.d?.status === "completed";
  return (
    <aside className="no-print brand-accent-card mb-6 overflow-hidden rounded-card border border-border bg-white p-5 shadow-card" aria-label={`Contexto de ${state.journey_title ?? state.journey_code}`}>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada
        </Link>
        <span className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.12em] text-muted">{state.journey_title ?? state.journey_code}</p>
          <p className="mt-1 flex items-center gap-2 font-semibold text-secondary"><Icon size={17} className="text-primary" aria-hidden="true" /> {labels[current]}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${diagnosticComplete ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          {diagnosticComplete ? <CheckCircle2 size={14} /> : <Compass size={14} />}
          {diagnosticComplete ? "Diagnóstico concluído" : current === "diagnostic" ? "Em andamento" : "Diagnóstico pendente"}
        </span>
      </div>
    </aside>
  );
}
