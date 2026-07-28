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

export const participantDiagnosticRuntime = {
  resolveEntry: (actorUserAccountId: string) => invokeServerRpc<ParticipantDiagnosticEntry>(
    "resolve_participant_diagnostic_entry",
    { p_actor_user_account_id: actorUserAccountId },
  ),
  getExperience: (actorUserAccountId: string, journeyInstanceId: string) => invokeServerRpc<ParticipantExperience>(
    "get_participant_experience_with_default_diagnostic",
    { p_actor_user_account_id: actorUserAccountId, p_journey_instance_id: journeyInstanceId },
  ),
};
