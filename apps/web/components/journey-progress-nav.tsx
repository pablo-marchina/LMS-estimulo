import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock3 } from "lucide-react";
import { openJourneyActivityAction } from "@/app/empreendedor/jornada/[journeyInstanceId]/actions";
import { LessonAutoAdvance } from "@/components/lesson-auto-advance";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { ButtonLink } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth/context";
import { displayContentName } from "@/lib/content/display-name";
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
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
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
  return (
    <form
      action={openJourneyActivityAction}
      className="min-w-0 flex-1 sm:flex-none"
      data-next-lesson-form={direction === "next" && enabled ? "true" : undefined}
    >
      <input type="hidden" name="journey_instance_id" value={journeyInstanceId} />
      <input type="hidden" name="step_instance_id" value={activity.step_instance_id} />
      <input type="hidden" name="step_aggregate_version" value={activity.step_aggregate_version} />
      <input type="hidden" name="step_status" value={activity.step_status} />
      <input type="hidden" name="idempotency_key" value={randomUUID()} />
      <PendingSubmitButton
        pendingLabel="Abrindo…"
        variant={direction === "previous" ? "secondary" : "primary"}
        size="sm"
        type="submit"
        disabled={!enabled}
        className={`w-full max-w-full gap-1.5 sm:w-auto ${direction === "next" ? "justify-between" : "justify-start"}`}
        title={activity.activity_title}
      >
        {direction === "previous" ? <ArrowLeft size={15} aria-hidden="true" /> : null}
        <span>{direction === "previous" ? "Aula anterior" : "Próxima aula"}</span>
        {direction === "next" ? <span className="hidden max-w-44 truncate text-xs font-medium opacity-85 sm:inline">{activity.activity_title}</span> : null}
        {direction === "next" ? <ArrowRight size={15} aria-hidden="true" /> : null}
      </PendingSubmitButton>
    </form>
  );
}

export async function JourneyProgressNav({ state, current, activityTitle, estimatedMinutes }: Props) {
  const stepStatus = state.s?.status ?? "available";
  const title = current === "activity" ? activityTitle ?? "Conteúdo da jornada" : current === "result" ? "Resultado da jornada" : "Conheça seu perfil";

  const auth = await getAuthContext();
  const outline = auth.status === "authenticated"
    ? await getParticipantJourneyOutline(auth.identity.user_account_id, state.journey_instance_id).catch(() => null)
    : null;
  const journeyLabel = displayContentName(
    outline?.journey_title ?? state.journey_title,
    displayContentName(state.journey_code, "Jornada"),
  );

  let previousActivity: Parameters<typeof ActivityNavigationForm>[0]["activity"] | null = null;
  let nextActivity: Parameters<typeof ActivityNavigationForm>[0]["activity"] | null = null;
  let lessonNumber: number | null = null;
  if (current === "activity" && state.s?.step_instance_id) {
    const activities = outline?.modules
      .slice()
      .sort((a, b) => a.module_position - b.module_position)
      .flatMap((module) => module.activities.slice().sort((a, b) => a.position - b.position)) ?? [];
    const currentIndex = activities.findIndex((activity) => activity.step_instance_id === state.s?.step_instance_id);
    lessonNumber = currentIndex >= 0 ? currentIndex + 1 : null;
    previousActivity = currentIndex > 0 ? activities[currentIndex - 1] : null;
    nextActivity = currentIndex >= 0 && currentIndex < activities.length - 1 ? activities[currentIndex + 1] : null;
  }

  return (
    <aside className="no-print border-b border-slate-200 pb-5" aria-label={`Contexto de ${title}`}>
      <Link href={`/empreendedor/jornada/${state.journey_instance_id}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary">
        <ArrowLeft size={15} aria-hidden="true" /> Voltar para a jornada
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary">{journeyLabel}</p>
          <h1 className="mt-1.5 text-[22px] font-bold leading-tight text-ink sm:text-[28px]">{title}</h1>
          {current === "activity" ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              {estimatedMinutes ? <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {estimatedMinutes} min</span> : null}
              {estimatedMinutes && lessonNumber ? <span aria-hidden="true">•</span> : null}
              {lessonNumber ? <span>Aula {lessonNumber}</span> : null}
              {(estimatedMinutes || lessonNumber) ? <span aria-hidden="true">•</span> : null}
              <span className={`inline-flex items-center gap-1 font-semibold ${stepStatus === "completed" ? "text-success" : "text-primary"}`}>
                {stepStatus === "completed" ? <CheckCircle2 size={13} /> : <CircleDot size={13} />}{statusCopy[stepStatus] ?? "Disponível"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {current === "activity" && (previousActivity || nextActivity) ? (
        <div className="mt-4 flex w-full items-start justify-between gap-3">
          {previousActivity ? <ActivityNavigationForm journeyInstanceId={state.journey_instance_id} activity={previousActivity} direction="previous" /> : <span className="hidden sm:block" />}
          {nextActivity ? <ActivityNavigationForm journeyInstanceId={state.journey_instance_id} activity={nextActivity} direction="next" /> : <ButtonLink href={`/empreendedor/resultado?journey=${state.journey_instance_id}`} size="sm" className="ml-auto" icon={<ArrowRight size={15} />}>Ver resultado</ButtonLink>}
        </div>
      ) : null}
      {current === "activity" ? <LessonAutoAdvance /> : null}
    </aside>
  );
}
