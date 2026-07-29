import "server-only";

import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type JourneyEditorActivityDetails = {
  activity_version_id: string;
  activity_definition_id: string;
  definition_code: string;
  definition_name: string;
  version_number: number;
  status: string;
  estimated_minutes: number;
  assets: Array<{
    id: string;
    asset_type: string;
    title: string;
    external_url: string | null;
    file_object_id: string | null;
    library_item_version_id: string | null;
    position: number;
    is_required: boolean;
    accessibility_metadata: Record<string, unknown>;
  }>;
};

export type JourneyEditorDetails = {
  journey_version_id: string;
  activities: JourneyEditorActivityDetails[];
};

export async function getAdminJourneyEditorDetails(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyVersionId: string;
}) {
  return invokeServerRpc<JourneyEditorDetails>("get_admin_journey_editor_details", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_journey_version_id: input.journeyVersionId,
  });
}

export async function createAdminJourneyDraftFromVersion(input: {
  actorUserAccountId: string;
  organizationId: string;
  sourceJourneyVersionId: string;
  idempotencyKey: string;
}) {
  return invokeServerRpc<{
    journey_version_id: string;
    version_number: number;
    source_journey_version_id: string;
    already_editable: boolean;
    replayed: boolean;
  }>("create_admin_journey_draft_from_version", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_source_journey_version_id: input.sourceJourneyVersionId,
    p_idempotency_key: input.idempotencyKey,
  });
}

export async function clearAdminActivityParts(input: {
  actorUserAccountId: string;
  organizationId: string;
  journeyVersionId: string;
  activityVersionId: string;
  clearContent: boolean;
  clearAssessment: boolean;
  clearPractice: boolean;
  idempotencyKey: string;
}) {
  return invokeServerRpc<Record<string, unknown>>("clear_admin_activity_parts", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_journey_version_id: input.journeyVersionId,
    p_activity_version_id: input.activityVersionId,
    p_clear_content: input.clearContent,
    p_clear_assessment: input.clearAssessment,
    p_clear_practice: input.clearPractice,
    p_idempotency_key: input.idempotencyKey,
  });
}
