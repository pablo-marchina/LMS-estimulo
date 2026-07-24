import Link from "next/link";
import { ArrowLeft, CheckCircle2, Compass, FileUp } from "lucide-react";
import type { JourneyState } from "@/lib/journey-runtime/contracts";

export function JourneyContextBar({ state, activityTitle, hasPractice }: {
  state: JourneyState;
  activityTitle: string;
  hasPractice: boolean;
}) {
  const diagnosticComplete = state.d?.status === "completed";
  return (
    <aside className="no-print brand-accent-card mb-7 overflow-hidden rounded-card border border-border bg-white p-5 shadow-card" aria-label="Contexto da jornada">
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada
        </Link>
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.12em] text-muted">{state.journey_title ?? state.journey_code}</p>
          <p className="mt-1 truncate font-semibold text-secondary">{activityTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${diagnosticComplete ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
            {diagnosticComplete ? <CheckCircle2 size={14} /> : <Compass size={14} />}
            {diagnosticComplete ? "Diagnóstico concluído" : "Diagnóstico pendente"}
          </span>
          {hasPractice ? <Link href="/empreendedor/entregas" className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-primary hover:bg-border"><FileUp size={14} /> Ver entregas</Link> : null}
        </div>
      </div>
    </aside>
  );
}
