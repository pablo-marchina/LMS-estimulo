import "server-only";
import type { ParticipantExperience } from "@/lib/journey-runtime/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type ParticipantDiagnosticEntry = {
  status: "available" | "in_progress" | "completed" | "profile_required" | "not_configured" | "journey_required";
  diagnostic_version_id?: string;
  diagnostic_name?: string;
  journey_instance_id?: string;
  journey_status?: string;
  journey_aggregate_version?: number;
  session_id?: string;
  session_aggregate_version?: number;
  next_path: string;
};

type EligibleJourney = {
  journey_version_id: string;
  open_to_all: boolean;
};

async function resolveEntry(actorUserAccountId: string) {
  return invokeServerRpc<ParticipantDiagnosticEntry>(
    "resolve_participant_diagnostic_entry",
    { p_actor_user_account_id: actorUserAccountId },
  );
}

async function ensureEntry(actorUserAccountId: string) {
  const current = await resolveEntry(actorUserAccountId);
  if (current.status !== "journey_required") return current;

  const eligible = await invokeServerRpc<EligibleJourney[]>(
    "e14_list_eligible_journeys",
    { p_actor_user_account_id: actorUserAccountId },
  );
  const journey = eligible.find((candidate) => candidate.open_to_all);
  if (!journey) return current;

  await invokeServerRpc("e14_self_enroll", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_version_id: journey.journey_version_id,
    p_idempotency_key: `diagnostic-context:${actorUserAccountId}:${journey.journey_version_id}`,
  });

  return resolveEntry(actorUserAccountId);
}

export const participantDiagnosticRuntime = {
  resolveEntry,
  ensureEntry,
  getExperience: (actorUserAccountId: string, journeyInstanceId: string) => invokeServerRpc<ParticipantExperience>(
    "get_participant_experience_with_default_diagnostic",
    { p_actor_user_account_id: actorUserAccountId, p_journey_instance_id: journeyInstanceId },
  ),
};
