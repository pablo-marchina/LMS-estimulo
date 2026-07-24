"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

const OPENAI_JOURNEY_VERSION_ID = "a4ffebde-f7de-4a76-af6a-221a2c398dd6";

export async function startProfileDiagnosticAction() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");

  let journeyInstanceId: string | null = null;

  try {
    const participantJourneys = await journeyRuntime.listParticipantJourneys(auth.identity.user_account_id);
    const pending = participantJourneys.journeys.find((journey) => journey.d?.status !== "completed")
      ?? participantJourneys.journeys.find((journey) => journey.journey_status !== "completed")
      ?? null;

    if (pending) {
      journeyInstanceId = pending.journey_instance_id;
    } else {
      const eligible = await journeyRuntime.listEligibleJourneys(auth.identity.user_account_id);
      const preferred = eligible.find((journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID)
        ?? eligible.find((journey) => /openai/i.test(journey.title))
        ?? eligible[0]
        ?? null;
      if (!preferred) redirect("/empreendedor/perfil?erro=diagnostico_indisponivel");

      const enrollment = await journeyRuntime.selfEnroll(
        auth.identity.user_account_id,
        preferred.journey_version_id,
        randomUUID(),
      );
      journeyInstanceId = enrollment.data.journey_instance_id;
    }

    const state = await journeyRuntime.getParticipantState(auth.identity.user_account_id, journeyInstanceId);
    if (state.journey_status === "available") {
      await journeyRuntime.startJourney(
        auth.identity.user_account_id,
        journeyInstanceId,
        state.journey_aggregate_version,
        randomUUID(),
      );
    }
  } catch {
    redirect("/empreendedor/perfil?erro=diagnostico_indisponivel");
  }

  redirect(`/empreendedor/diagnostico?journey=${journeyInstanceId}`);
}
