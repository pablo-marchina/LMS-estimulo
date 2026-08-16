"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const version = z.coerce.number().int().nonnegative();

export async function openJourneyAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const journeyInstanceId = uuid.parse(formData.get("journey_instance_id"));
  const submittedVersion = version.parse(formData.get("aggregate_version") ?? 0);
  const key = String(formData.get("idempotency_key") || randomUUID());

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
    if (state.journey_status !== "completed") {
      await journeyRuntime.ensureDefaultPath(auth.identity.user_account_id, journeyInstanceId, `${key}:paths`);
    }
  } catch {
    redirect("/empreendedor/jornadas?erro=abrir_jornada");
  }
  redirect(`/empreendedor/jornada/${journeyInstanceId}`);
}
