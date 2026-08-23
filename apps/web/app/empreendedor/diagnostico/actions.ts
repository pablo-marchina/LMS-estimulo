"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertParticipantMutationAllowed, requireParticipantContext } from "@/lib/auth/participant-context";
import { JourneyRpcError, journeyRuntime } from "@/lib/journey-runtime/rpc";
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

function diagnosticDestination(journey: string, error: "resposta_pendente" | "sincronizacao") {
  return `/empreendedor/diagnostico?journey=${journey}&erro=${error}`;
}

function isStateConflict(error: unknown): error is JourneyRpcError {
  return error instanceof JourneyRpcError && error.code === "23505";
}

export async function saveProfileDiagnosisAnswerAction(input: z.infer<typeof diagnosticAnswerSchema>) {
  await assertParticipantMutationAllowed();
  const parsed = diagnosticAnswerSchema.parse(input);
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;

  let experience = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId);
  if (experience.state.d?.status === "completed") return { ok: true as const };
  if (!experience.diagnostic) return { ok: false as const, code: "DIAGNOSTIC_NOT_AVAILABLE" };
  let diagnostic = experience.diagnostic;

  const submittedItem = diagnostic.items.find((item) => item.id === parsed.itemId);
  if (!submittedItem) return { ok: false as const, code: "DIAGNOSTIC_ITEM_NOT_AVAILABLE" };
  if (!submittedItem.options.some((option) => option.code === parsed.optionCode)) {
    return { ok: false as const, code: "DIAGNOSTIC_OPTION_NOT_AVAILABLE" };
  }

  if (!experience.state.d) {
    try {
      await journeyRuntime.startDiagnostic(
        actor,
        parsed.journeyInstanceId,
        diagnostic.version_id,
        `${parsed.idempotencyKey}:start`,
      );
    } catch (error) {
      if (!isStateConflict(error)) {
        const latest = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId).catch(() => null);
        if (!latest?.state.d) return { ok: false as const, code: "DIAGNOSTIC_START_FAILED" };
      }
    }
    experience = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId);
    if (!experience.diagnostic) return { ok: false as const, code: "DIAGNOSTIC_NOT_AVAILABLE" };
    diagnostic = experience.diagnostic;
  }

  const sessionId = experience.state.d?.session_id;
  if (!sessionId) return { ok: false as const, code: "DIAGNOSTIC_SESSION_NOT_AVAILABLE" };

  const latestItem = diagnostic.items.find((item) => item.id === parsed.itemId);
  if (!latestItem) return { ok: false as const, code: "DIAGNOSTIC_ITEM_NOT_AVAILABLE" };
  if (latestItem.response?.option_code === parsed.optionCode) return { ok: true as const };

  const revision = (latestItem.response?.revision ?? 0) + 1;
  try {
    await journeyRuntime.recordDiagnosticResponse(
      actor,
      sessionId,
      parsed.itemId,
      parsed.optionCode,
      revision,
      `${parsed.idempotencyKey}:item:${parsed.itemId}:revision:${revision}:option:${parsed.optionCode}`,
    );
  } catch (error) {
    const latest = await journeyRuntime.getParticipantExperience(actor, parsed.journeyInstanceId).catch(() => null);
    const persisted = latest?.diagnostic?.items.find((item) => item.id === parsed.itemId)?.response?.option_code;
    if (persisted !== parsed.optionCode) {
      return { ok: false as const, code: isStateConflict(error) ? "DIAGNOSTIC_STATE_CONFLICT" : "DIAGNOSTIC_RESPONSE_FAILED" };
    }
  }

  return { ok: true as const };
}

export async function submitProfileDiagnosisAction(formData: FormData) {
  await assertParticipantMutationAllowed();
  const auth = await requireParticipantContext();
  const actor = auth.identity.user_account_id;
  const journey = uuid.parse(formData.get("journey_instance_id"));
  const baseKey = String(formData.get("idempotency_key") || randomUUID());

  let experience;
  try {
    experience = await journeyRuntime.getParticipantExperience(actor, journey);
  } catch {
    redirect(diagnosticDestination(journey, "sincronizacao"));
  }
  if (experience.state.d?.status === "completed") redirect(resultDestination(journey));
  if (!experience.diagnostic) redirect(diagnosticDestination(journey, "sincronizacao"));
  let diagnostic = experience.diagnostic;

  if (!experience.state.d) {
    try {
      await journeyRuntime.startDiagnostic(actor, journey, diagnostic.version_id, `${baseKey}:start`);
    } catch {
      // Re-read below. A concurrent start or a delayed response is valid if the session now exists.
    }
    experience = await journeyRuntime.getParticipantExperience(actor, journey).catch(() => null);
    if (!experience?.diagnostic || !experience.state.d) redirect(diagnosticDestination(journey, "sincronizacao"));
    diagnostic = experience.diagnostic;
  }

  const sessionId = experience.state.d?.session_id;
  if (!sessionId) redirect(diagnosticDestination(journey, "sincronizacao"));

  for (const item of diagnostic.items) {
    const option = String(formData.get(`answer_${item.id}`) ?? "").trim();
    if (item.is_required && !option) redirect(diagnosticDestination(journey, "resposta_pendente"));
    if (option && !item.options.some((candidate) => candidate.code === option)) {
      redirect(diagnosticDestination(journey, "sincronizacao"));
    }
    if (option && item.response?.option_code !== option) {
      const revision = (item.response?.revision ?? 0) + 1;
      try {
        await journeyRuntime.recordDiagnosticResponse(
          actor,
          sessionId,
          item.id,
          option,
          revision,
          `${baseKey}:item:${item.id}:revision:${revision}:option:${option}`,
        );
      } catch {
        const latest = await journeyRuntime.getParticipantExperience(actor, journey).catch(() => null);
        const persisted = latest?.diagnostic?.items.find((candidate) => candidate.id === item.id)?.response?.option_code;
        if (persisted !== option) redirect(diagnosticDestination(journey, "sincronizacao"));
      }
    }
  }

  experience = await journeyRuntime.getParticipantExperience(actor, journey).catch(() => null);
  if (!experience) redirect(diagnosticDestination(journey, "sincronizacao"));
  if (experience.state.d?.status === "completed") redirect(resultDestination(journey));
  const aggregate = experience.state.d?.aggregate_version;
  if (aggregate === undefined) redirect(diagnosticDestination(journey, "sincronizacao"));

  try {
    await invokeServerRpc("complete_participant_diagnostic_with_points", {
      p_actor_user_account_id: actor,
      p_session_id: sessionId,
      p_expected_aggregate_version: aggregate,
      p_journey_instance_id: journey,
      p_completion_idempotency_key: `${baseKey}:complete`,
      p_points_idempotency_key: `${baseKey}:points`,
    });
  } catch {
    const latest = await journeyRuntime.getParticipantExperience(actor, journey).catch(() => null);
    if (!latest || latest.state.d?.status !== "completed") redirect(diagnosticDestination(journey, "sincronizacao"));
  }

  redirect(resultDestination(journey));
}
