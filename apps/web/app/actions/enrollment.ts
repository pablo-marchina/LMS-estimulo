"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();

export async function selfEnrollAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const journeyVersionId = uuid.parse(formData.get("journey_version_id"));
  const key = String(formData.get("idempotency_key") || randomUUID());

  let journeyInstanceId: string;
  try {
    const enrollment = await journeyRuntime.selfEnroll(auth.identity.user_account_id, journeyVersionId, key);
    journeyInstanceId = enrollment.data.journey_instance_id;

    let state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    if (state.journey_status === "available") {
      await journeyRuntime.startJourney(
        auth.identity.user_account_id,
        journeyInstanceId,
        state.journey_aggregate_version,
        `${key}:start`,
      );
      state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    }
    if (!state.s?.step_instance_id) {
      await journeyRuntime.ensureDefaultPath(auth.identity.user_account_id, journeyInstanceId, `${key}:default-path`);
    }
  } catch {
    redirect("/empreendedor/jornadas?erro=matricula");
  }

  redirect(`/empreendedor/jornada/${journeyInstanceId}?matricula=criada`);
}
