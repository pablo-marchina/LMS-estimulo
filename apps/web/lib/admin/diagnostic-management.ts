import "server-only";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type RetiredDiagnostic = {
  definition_id: string;
  name: string;
  status: "retired";
};

export const diagnosticManagementRuntime = {
  retire: (input: {
    actorUserAccountId: string;
    organizationId: string;
    definitionId: string;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<RetiredDiagnostic> | RetiredDiagnostic>("retire_admin_diagnostic", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_definition_id: input.definitionId,
    p_idempotency_key: input.idempotencyKey,
  }),
};
