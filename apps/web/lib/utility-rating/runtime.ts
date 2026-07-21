import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";

export type ActivityUtilityRating = {
  step_instance_id: string;
  rating: number | null;
  revision: number;
  updated_at: string | null;
};

export const utilityRatingRuntime = {
  get: (actorUserAccountId: string, stepInstanceId: string) =>
    invokeServerRpc<ActivityUtilityRating>("get_activity_utility_rating", {
      p_actor_user_account_id: actorUserAccountId,
      p_step_instance_id: stepInstanceId,
    }),

  rate: (actorUserAccountId: string, stepInstanceId: string, rating: number, idempotencyKey: string) =>
    invokeServerRpc<RpcEnvelope<ActivityUtilityRating>>("rate_activity_utility", {
      p_actor_user_account_id: actorUserAccountId,
      p_step_instance_id: stepInstanceId,
      p_rating: rating,
      p_idempotency_key: idempotencyKey,
    }),
};
