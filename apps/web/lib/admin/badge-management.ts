import "server-only";

import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export function saveAdminBadgeCatalog(input: {
  actorUserAccountId: string;
  organizationId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{
    definition_id: string;
    version_id: string;
    criteria_rule_version_id: string | null;
    status: string;
    replayed: boolean;
  }>("save_admin_badge_catalog", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_payload: input.payload,
    p_idempotency_key: input.idempotencyKey,
  });
}
