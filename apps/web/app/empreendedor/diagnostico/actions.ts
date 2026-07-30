"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

const uuid = z.string().uuid();

export async function submitProfileDiagnosisAction(formData: FormData) {
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());

  let experience = await journeyRuntime.getParticipantExperience(actor, journey);
  if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
  let diagnostic = experience.diagnostic;

  if (!experience.state.d) {
    await journeyRuntime.startDiagnostic(actor, journey, diagnostic.version_id, `${baseKey}:start`);
    experience = await journeyRuntime.getParticipantExperience(actor, journey);
    if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
    diagnostic = experience.diagnostic;
  }

  const sessionId = experience.state.d?.session_id;
  if (!sessionId) throw new Error("DIAGNOSTIC_SESSION_NOT_AVAILABLE");

  for (const item of diagnostic.items) {
    const option = String(formData.get(`answer_${item.id}`) ?? "");
    if (item.is_required && !option) throw new Error("DIAGNOSTIC_REQUIRED_ANSWER_MISSING");
    if (option && item.response?.option_code !== option) {
      const revision = (item.response?.revision ?? 0) + 1;
      await journeyRuntime.recordDiagnosticResponse(
        actor,
        sessionId,
        item.id,
        option,
        revision,
        `${baseKey}:item:${item.id}:revision:${revision}`,
      );
    }
  }

  experience = await journeyRuntime.getParticipantExperience(actor, journey);
  const aggregate = experience.state.d?.aggregate_version;
  if (aggregate === undefined) throw new Error("DIAGNOSTIC_VERSION_NOT_AVAILABLE");

  await journeyRuntime.completeDiagnostic(actor, sessionId, aggregate, `${baseKey}:complete`);
  await invokeServerRpc("award_participant_action_points", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: journey,
    p_action_code: "complete_diagnostic",
    p_source_reference: sessionId,
    p_idempotency_key: `${baseKey}:points`,
  });

  redirect(`/empreendedor/resultado?journey=${journey}&diagnostico=concluido`);
}
