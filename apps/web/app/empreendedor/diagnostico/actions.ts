"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertParticipantMutationAllowed, requireParticipantContext } from "@/lib/auth/participant-context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

const uuid = z.string().uuid();
const diagnosticAnswerSchema = z.object({
  journeyInstanceId: z.string().uuid(),
  itemId: z.string().uuid(),
  optionCode: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(300),
});

function resultDestination(journey: string) {
  return `/empreendedor/resultado?journey=${journey}&diagnostico=concluido`;
}

export async function saveProfileDiagnosisAnswerAction(input: z.infer<typeof diagnosticAnswerSchema>) {
  await assertParticipantMutationAllowed();
  const parsed = diagnosticAnswerSchema.parse(input);
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;

  let experience = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId);
  if (experience.state.d?.status === "completed") return { ok: true as const };
  if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
  let diagnostic = experience.diagnostic;

  const submittedItem = diagnostic.items.find((item) => item.id === parsed.itemId);
  if (!submittedItem) throw new Error("DIAGNOSTIC_ITEM_NOT_AVAILABLE");
  if (!submittedItem.options.some((option) => option.code === parsed.optionCode)) {
    throw new Error("DIAGNOSTIC_OPTION_NOT_AVAILABLE");
  }

  if (!experience.state.d) {
    await journeyRuntime.startDiagnostic(
      actor,
      parsed.journeyInstanceId,
      diagnostic.version_id,
      `${parsed.idempotencyKey}:start`,
    );
    experience = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId);
    if (!experience.diagnostic) throw new Error("DIAGNOSTIC_NOT_AVAILABLE");
    diagnostic = experience.diagnostic;
  }

  const sessionId = experience.state.d?.session_id;
  if (!sessionId) throw new Error("DIAGNOSTIC_SESSION_NOT_AVAILABLE");

  const latestItem = diagnostic.items.find((item) => item.id === parsed.itemId);
  if (!latestItem) throw new Error("DIAGNOSTIC_ITEM_NOT_AVAILABLE");
  if (latestItem.response?.option_code === parsed.optionCode) return { ok: true as const };

  const revision = (latestItem.response?.revision ?? 0) + 1;
  await journeyRuntime.recordDiagnosticResponse(
    actor,
    sessionId,
    parsed.itemId,
    parsed.optionCode,
    revision,
    `${parsed.idempotencyKey}:item:${parsed.itemId}:revision:${revision}:option:${parsed.optionCode}`,
  );

  return { ok: true as const };
}

export async function submitProfileDiagnosisAction(formData: FormData) {
  await assertParticipantMutationAllowed();
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());

  let experience = await journeyRuntime.getParticipantExperience(actor, journey);
  if (experience.state.d?.status === "completed") redirect(resultDestination(journey));
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
    const option = String(formData.get(`answer_${item.id}`) ?? "").trim();
    if (item.is_required && !option) throw new Error("DIAGNOSTIC_REQUIRED_ANSWER_MISSING");
    if (option && !item.options.some((candidate) => candidate.code === option)) {
      throw new Error("DIAGNOSTIC_OPTION_NOT_AVAILABLE");
    }
    if (option && item.response?.option_code !== option) {
      const revision = (item.response?.revision ?? 0) + 1;
      await journeyRuntime.recordDiagnosticResponse(
        actor,
        sessionId,
        item.id,
        option,
        revision,
        `${baseKey}:item:${item.id}:revision:${revision}:option:${option}`,
      );
    }
  }

  experience = await journeyRuntime.getParticipantExperience(actor, journey);
  const aggregate = experience.state.d?.aggregate_version;
  if (aggregate === undefined) throw new Error("DIAGNOSTIC_VERSION_NOT_AVAILABLE");

  let completionError: unknown = null;
  try {
    await invokeServerRpc("complete_participant_diagnostic_with_points", {
      p_actor_user_account_id: actor,
      p_session_id: sessionId,
      p_expected_aggregate_version: aggregate,
      p_journey_instance_id: journey,
      p_completion_idempotency_key: `${baseKey}:complete`,
      p_points_idempotency_key: `${baseKey}:points`,
    });
  } catch (error) {
    completionError = error;
  }

  if (completionError) {
    const latest = await journeyRuntime.getParticipantExperience(actor, journey);
    if (latest.state.d?.status !== "completed") throw completionError;
  }

  redirect(resultDestination(journey));
}
