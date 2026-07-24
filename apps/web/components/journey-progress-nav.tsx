import Link from "next/link";
import { ArrowLeft, CheckCircle2, Compass, FileUp, Flag, Sparkles } from "lucide-react";
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
    <aside className="no-print brand-card relative mb-6 overflow-hidden rounded-card border border-primary/15 bg-[linear-gradient(115deg,rgba(255,255,255,.98),rgba(233,234,255,.94),rgba(234,251,241,.92))] p-5 shadow-md" aria-label={`Contexto de ${state.journey_title ?? state.journey_code}`}>
      <div className="absolute -right-10 -top-12 size-32 rounded-full border-[22px] border-brand-magenta/10" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center gap-4">
        <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="brand-button flex items-center gap-2 rounded-xl border border-primary/15 bg-white/85 px-3 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Voltar à jornada
        </Link>
        <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-md"><Icon size={21} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.14em] text-primary/70">{state.journey_title ?? state.journey_code}</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-black text-secondary"><Sparkles size={16} className="text-brand-magenta" aria-hidden="true" /> {labels[current]}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${diagnosticComplete ? "bg-brand-green text-secondary" : "bg-warning-soft text-warning"}`}>
          {diagnosticComplete ? <CheckCircle2 size={14} /> : <Compass size={14} />}
          {diagnosticComplete ? "Diagnóstico concluído" : current === "diagnostic" ? "Em andamento" : "Diagnóstico pendente"}
        </span>
      </div>
    </aside>
  );
}
