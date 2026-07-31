import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock3, Flag, PlayCircle } from "lucide-react";
import { openJourneyActivityAction } from "@/app/empreendedor/jornada/[journeyInstanceId]/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getAuthContext } from "@/lib/auth/context";
import type { JourneyState } from "@/lib/journey-runtime/contracts";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";

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

function ActivityNavigationForm({
  journeyInstanceId,
  activity,
  direction,
}: {
  journeyInstanceId: string;
  activity: {
    step_instance_id: string;
    step_aggregate_version: number;
    step_status: string;
    activity_title: string;
    can_open: boolean;
    can_start: boolean;
  };
  direction: "previous" | "next";
}) {
  const enabled = activity.step_status === "completed" || activity.can_open || activity.can_start;
  const label = direction === "previous" ? "Anterior" : "Próxima";
  return <form action={openJourneyActivityAction} className="min-w-0">
    <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
    <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
    <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
    <input type="hidden" name="step_status" value={activity.step_status} />
    <input type="hidden" name="idempotency_key" value={randomUUID()} />
    <PendingSubmitButton
      pendingLabel="Abrindo…"
      variant="secondary"
      size="sm"
      type="submit"
      disabled={!enabled}
      className="max-w-full gap-1.5"
      title={activity.activity_title}
    >
      {direction === "previous" ? <ArrowLeft size={15} aria-hidden="true" /> : null}
      <span className="hidden sm:inline">{label}:</span>
      <span className="max-w-40 truncate">{activity.activity_title}</span>
      {direction === "next" ? <ArrowRight size={15} aria-hidden="true" /> : null}
    </PendingSubmitButton>
  </form>;
}

export async function JourneyProgressNav({ state, current, activityTitle, estimatedMinutes }: Props) {
  const stepStatus = state.s?.status ?? "available";
  const title = current === "activity" ? activityTitle ?? "Atividade da jornada" : current === "result" ? "Resultado da jornada" : "Conheça seu perfil";
  const Icon = current === "activity" ? PlayCircle : current === "result" ? Flag : CircleDot;

  let previousActivity: Parameters<typeof ActivityNavigationForm>[0]["activity"] | null = null;
  let nextActivity: Parameters<typeof ActivityNavigationForm>[0]["activity"] | null = null;
  if (current === "activity" && state.s?.step_instance_id) {
    const auth = await getAuthContext();
    if (auth.status === "authenticated") {
      const outline = await getParticipantJourneyOutline(auth.identity.user_account_id, state.journey_instance_id).catch(() => null);
      const activities = outline?.modules
        .slice()
        .sort((a, b) => a.module_position - b.module_position)
        .flatMap((module) => module.activities.slice().sort((a, b) => a.position - b.position)) ?? [];
      const currentIndex = activities.findIndex((activity) => activity.step_instance_id === state.s?.step_instance_id);
      previousActivity = currentIndex > 0 ? activities[currentIndex - 1] : null;
      nextActivity = currentIndex >= 0 && currentIndex < activities.length - 1 ? activities[currentIndex + 1] : null;
    }
  }

  return (
    <aside className="no-print brand-activity-context relative mb-0 overflow-hidden rounded-2xl border border-primary/15 bg-white p-4 shadow-sm" aria-label={`Contexto de ${title}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="brand-button inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Jornada
        </Link>
        <div className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-sm"><Icon size={19} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[.13em] text-primary/70">{state.journey_title ?? state.journey_code}</p>
          <p className="mt-0.5 truncate text-base font-black text-secondary">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {current === "activity" && estimatedMinutes ? <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-xs font-bold text-info"><Clock3 size={14} /> {estimatedMinutes} min</span> : null}
          {current === "activity" ? <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${stepStatus === "completed" ? "bg-success-soft text-success" : "bg-primary-soft text-primary"}`}>{stepStatus === "completed" ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}{statusCopy[stepStatus] ?? "Atividade disponível"}</span> : null}
        </div>
      </div>
      {current === "activity" && (previousActivity || nextActivity) ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">{previousActivity ? <ActivityNavigationForm journeyInstanceId={state.journey_instance_id} activity={previousActivity} direction="previous" /> : <span />}{nextActivity ? <ActivityNavigationForm journeyInstanceId={state.journey_instance_id} activity={nextActivity} direction="next" /> : <Link href={`/empreendedor/resultado?journey=${state.journey_instance_id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-active">Ver resultado <ArrowRight size={15} /></Link>}</div> : null}
    </aside>
  );
}
