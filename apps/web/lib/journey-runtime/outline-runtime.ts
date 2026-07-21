import "server-only";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export function getParticipantJourneyOutline(actorUserAccountId: string, journeyInstanceId: string) {
  return invokeServerRpc<ParticipantJourneyOutline>("get_participant_journey_outline", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_instance_id: journeyInstanceId,
  });
}
