import "server-only";
import { randomUUID } from "node:crypto";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export async function getParticipantJourneyOutline(actorUserAccountId: string, journeyInstanceId: string) {
  await invokeServerRpc<Record<string, unknown>>("ensure_participant_open_paths", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_instance_id: journeyInstanceId,
    p_idempotency_key: randomUUID(),
  });
  return invokeServerRpc<ParticipantJourneyOutline>("get_participant_journey_outline", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_instance_id: journeyInstanceId,
  });
}
