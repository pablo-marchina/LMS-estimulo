"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { getParticipantJourneyOutline } from "@/lib/journey-runtime/outline-runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const version = z.coerce.number().int().nonnegative();

export async function continueJourneyAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const journeyInstanceId = uuid.parse(formData.get("journey_instance_id"));
  const submittedVersion = version.parse(formData.get("aggregate_version") ?? 0);
  const key = String(formData.get("idempotency_key") || randomUUID());
  let target = `/empreendedor/jornada/${journeyInstanceId}`;

  try {
    let state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    if (state.journey_status === "available") {
      await journeyRuntime.startJourney(
        auth.identity.user_account_id,
        journeyInstanceId,
        state.journey_aggregate_version ?? submittedVersion,
        `${key}:start-journey`,
      );
      state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    }
    if (state.journey_status !== "completed" && !state.s?.step_instance_id) {
      await journeyRuntime.ensureDefaultPath(auth.identity.user_account_id, journeyInstanceId, `${key}:ensure-path`);
    }

    const outline = await getParticipantJourneyOutline(auth.identity.user_account_id, journeyInstanceId);
    const next = outline.modules
      .flatMap((module) => module.activities)
      .find((activity) => activity.step_status !== "completed" && (activity.can_start || activity.can_open));

    if (next) {
      if (next.step_status === "available") {
        await journeyRuntime.startActivity(
          auth.identity.user_account_id,
          next.step_instance_id,
          next.step_aggregate_version,
          `${key}:start-activity`,
        );
      }
      await journeyRuntime.focusActivity(
        auth.identity.user_account_id,
        journeyInstanceId,
        next.step_instance_id,
        `${key}:focus`,
      );
      target = `/empreendedor/atividade/${next.step_instance_id}?journey=${journeyInstanceId}`;
    }
  } catch {
    target = `/empreendedor/jornada/${journeyInstanceId}?erro=continuar_jornada`;
  }

  redirect(target);
}
