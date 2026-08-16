import "server-only";
import { randomUUID } from "node:crypto";
import type { ParticipantJourneyOutline } from "@/lib/journey-runtime/outline-contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

function loadOutline(actorUserAccountId: string, journeyInstanceId: string) {
  return invokeServerRpc<ParticipantJourneyOutline>("get_participant_journey_outline", {
    p_actor_user_account_id: actorUserAccountId,
    p_journey_instance_id: journeyInstanceId,
  });
}

export async function getParticipantJourneyOutline(actorUserAccountId: string, journeyInstanceId: string) {
  // Reading an already-materialized journey must not depend on a maintenance/reconcile
  // command being available. New enrollments materialize a default path in the write
  // flow; this reconcile only expands open-all-path journeys and is therefore best effort.
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
}
