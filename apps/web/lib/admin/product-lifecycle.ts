import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export function retireAdminJourney(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyDefinitionId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{ journey_definition_id: string; status: string; replayed: boolean }>("save_admin_product_resource", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_resource_type: "journey_retire",
    p_payload: { journey_definition_id: input.journeyDefinitionId },
    p_idempotency_key: input.idempotencyKey,
  });
}

export function unpublishAdminJourneyToDraft(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyVersionId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{
    source_journey_version_id: string;
    journey_version_id: string;
    journey_definition_id: string;
    status: "draft";
    replayed: boolean;
  }>("save_admin_product_resource", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_resource_type: "journey_unpublish_to_draft",
    p_payload: { journey_version_id: input.journeyVersionId },
    p_idempotency_key: input.idempotencyKey,
  });
}

export function deleteAdminJourneyDraft(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyVersionId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{
    journey_version_id: string;
    journey_definition_id: string;
    status: "retired";
    replayed: boolean;
  }>("save_admin_product_resource", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_resource_type: "journey_draft_delete",
    p_payload: { journey_version_id: input.journeyVersionId },
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
  }>("save_admin_product_resource", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_resource_type: "diagnostic_transition",
    p_payload: {
      diagnostic_version_id: input.diagnosticVersionId,
      archetype_mapping: input.archetypeMapping,
    },
    p_idempotency_key: input.idempotencyKey,
  });
}
