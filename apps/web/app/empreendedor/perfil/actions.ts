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
    const explicitPendingDiagnostic = participantJourneys.journeys.find(
      (journey) => journey.d !== null && journey.d.status !== "completed",
    ) ?? null;
    const enrolledOpenAI = participantJourneys.journeys.find(
      (journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID || /openai/i.test(journey.journey_title ?? ""),
    ) ?? null;

    if (explicitPendingDiagnostic) {
      journeyInstanceId = explicitPendingDiagnostic.journey_instance_id;
    } else if (enrolledOpenAI) {
      journeyInstanceId = enrolledOpenAI.journey_instance_id;
    } else {
      const eligible = await journeyRuntime.listEligibleJourneys(auth.identity.user_account_id);
      const preferred = eligible.find((journey) => journey.journey_version_id === OPENAI_JOURNEY_VERSION_ID)
        ?? eligible.find((journey) => /openai/i.test(journey.title))
        ?? null;
      if (!preferred) throw new Error("DIAGNOSTIC_JOURNEY_NOT_AVAILABLE");

      const enrollment = await journeyRuntime.selfEnroll(
        auth.identity.user_account_id,
        preferred.journey_version_id,
        randomUUID(),
      );
      journeyInstanceId = enrollment.data.journey_instance_id;
    }

    if (!journeyInstanceId) throw new Error("DIAGNOSTIC_JOURNEY_INSTANCE_NOT_AVAILABLE");
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

  if (!journeyInstanceId) redirect("/empreendedor/perfil?erro=diagnostico_indisponivel");
  redirect(`/empreendedor/diagnostico?journey=${journeyInstanceId}`);
}
