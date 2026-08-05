"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const version = z.coerce.number().int().nonnegative();

export async function openJourneyAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const journeyInstanceId = uuid.parse(formData.get("journey_instance_id"));
  const submittedVersion = version.parse(formData.get("aggregate_version") ?? 0);
  const key = String(formData.get("idempotency_key") || randomUUID());
  let destination = `/empreendedor/jornada/${journeyInstanceId}`;

  try {
    let state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    if (state.journey_status === "available") {
      await journeyRuntime.startJourney(
        auth.identity.user_account_id,
        journeyInstanceId,
        state.journey_aggregate_version ?? submittedVersion,
        `${key}:start`,
      );
      state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    }

    // Idempotent reconciliation is intentionally executed on every open journey.
    // This repairs old enrollments created before new paths/activities were published.
    if (state.journey_status !== "completed") {
      await journeyRuntime.ensureDefaultPath(auth.identity.user_account_id, journeyInstanceId, `${key}:reconcile-paths`);
      state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    }

    if (state.journey_status !== "completed") {
      const outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
      const nextActivity = outline.modules
        .flatMap((module) => module.activities)
        .find((activity) => activity.step_status !== "completed" && (activity.can_open || activity.can_start));

      if (nextActivity) {
        if (nextActivity.step_status === "available") {
          await journeyRuntime.startActivity(
            auth.identity.user_account_id,
            nextActivity.step_instance_id,
            nextActivity.step_aggregate_version,
            `${key}:start-activity`,
          );
        }
        await journeyRuntime.focusActivity(
          auth.identity.user_account_id,
          journeyInstanceId,
          nextActivity.step_instance_id,
          `${key}:focus-activity`,
        );
        destination = `/empreendedor/atividade/${nextActivity.step_instance_id}?journey=${journeyInstanceId}`;
      }
    }
  } catch {
    redirect("/empreendedor/jornadas?erro=abrir_jornada");
  }
  redirect(destination);
}
