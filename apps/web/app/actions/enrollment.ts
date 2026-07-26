"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const uuid = z.string().uuid();
const destination = z.enum(["journey", "diagnostic"]).catch("journey");

export async function selfEnrollAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const journeyVersionId = uuid.parse(formData.get("journey_version_id"));
  const next = destination.parse(String(formData.get("next") ?? "journey"));
  const key = String(formData.get("idempotency_key") || randomUUID());

  let journeyInstanceId: string;
  try {
    const enrollment = await journeyRuntime.selfEnroll(auth.identity.user_account_id, journeyVersionId, key);
    journeyInstanceId = enrollment.data.journey_instance_id;

    const state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    if (state.journey_status === "available") {
      await journeyRuntime.startJourney(
        auth.identity.user_account_id,
        journeyInstanceId,
        state.journey_aggregate_version,
        `${key}:start`,
      );
      await engagementRuntime.awardAction({
        actorUserAccountId: auth.identity.user_account_id,
        journeyInstanceId,
        actionCode: "complete_welcome",
        sourceReference: "first_journey_start",
        idempotencyKey: `${key}:welcome-points`,
      }).catch(() => null);
    }
  } catch {
    redirect("/empreendedor/jornadas?erro=matricula");
  }

  redirect(next === "diagnostic"
    ? `/empreendedor/diagnostico?journey=${journeyInstanceId}`
    : `/empreendedor/jornada/${journeyInstanceId}?matricula=criada`);
}
