import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type ParticipantActivityCompletion = {
  step_instance_id: string;
  journey_instance_id: string;
  status: "completed" | "blocked";
  code?: "REQUIRED_CONTENT_INCOMPLETE" | "ASSESSMENT_NOT_PASSED" | "PRACTICE_COMPLETION_MANAGED_BY_REVIEW";
  changed: boolean;
};

export function completeParticipantActivity(input: {
  actorUserAccountId: string;
  stepInstanceId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<ParticipantActivityCompletion>("complete_participant_activity", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_step_instance_id: input.stepInstanceId,
    p_idempotency_key: input.idempotencyKey,
  });
}
