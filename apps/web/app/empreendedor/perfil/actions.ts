"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

const OPENAI_JOURNEY_VERSION_ID = "a4ffebde-f7de-4a76-af6a-221a2c398dd6";
const objectiveSchema = z.string().trim().min(5).max(500);

export async function saveApplicationObjectiveAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");
  const parsed = objectiveSchema.safeParse(formData.get("application_objective"));
  if (!parsed.success) redirect("/empreendedor/perfil?erro=objetivo_invalido");

  try {
    await invokeServerRpc("set_participant_application_objective", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_objective: parsed.data,
      p_idempotency_key: randomUUID(),
    });
  } catch {
    redirect("/empreendedor/perfil?erro=objetivo_indisponivel");
  }
  redirect("/empreendedor/perfil?sucesso=objetivo_salvo");
}

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
