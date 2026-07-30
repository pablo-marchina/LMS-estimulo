import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export function retireAdminJourney(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyDefinitionId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ journey_definition_id: string; status: string; replayed: boolean }>("retire_admin_journey", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_journey_definition_id: input.journeyDefinitionId,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function publishAdminDiagnosticTransition(input: {
  actorUserAccountId: string;
  organizationId: string;
  diagnosticVersionId: string;
  archetypeMapping: Record<string, string>;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{
    diagnostic_version_id: string;
    previous_diagnostic_version_id: string | null;
    remapped_assignments: number;
    remapped_journey_versions: number;
    replayed: boolean;
  }>("publish_admin_diagnostic_transition", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_diagnostic_version_id: input.diagnosticVersionId,
    p_archetype_mapping: input.archetypeMapping,
    p_idempotency_key: input.idempotencyKey,
  });
}
