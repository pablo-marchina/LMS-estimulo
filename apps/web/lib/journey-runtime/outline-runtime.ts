import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

function loadOutline(actorUserAccountId: string, journeyInstanceId: string) {
  return invokeServerRpc<ParticipantJourneyOutline>("get_participant_journey_outline", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_instance_id: journeyInstanceId,
  });
}

export const getParticipantJourneyOutline = cache(async (actorUserAccountId: string, journeyInstanceId: string) => {
  const currentOutline = await loadOutline(actorUserAccountId, journeyInstanceId);
  try {
    await invokeServerRpc<Record<string, unknown>>("ensure_participant_open_paths", {
      p_actor_user_account_id: actorUserAccountId,
      p_journey_instance_id: journeyInstanceId,
      p_idempotency_key: randomUUID(),
    });
    return await loadOutline(actorUserAccountId, journeyInstanceId);
  } catch {
    return currentOutline;
  }
});
