import "server-only";

import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type JsonRecord = Record<string, unknown>;

export type ExtensionParticipant = {
  user_account_id: string;
  entrepreneur_id: string | null;
  email: string;
  name: string;
};

export type AdminExtensionsWorkspace = {
  organization_id: string;
  settings: JsonRecord | null;
  legal_documents: JsonRecord[];
  themes: JsonRecord[];
  tracking_links: JsonRecord[];
  tracking_recent_visits: JsonRecord[];
  certificate_templates: { assets: JsonRecord[]; assignments: JsonRecord[] };
  b2b: { groups: JsonRecord[]; pages: JsonRecord[] };
  reward_settings: JsonRecord | null;
  rewards: JsonRecord[];
  redemptions: JsonRecord[];
  delivery_configurations: JsonRecord[];
  delivery_submissions: JsonRecord[];
  optional_diagnostics: JsonRecord[];
  diagnostic_versions: JsonRecord[];
  behavior_scores: JsonRecord[];
  participants: ExtensionParticipant[];
  programs: JsonRecord[];
  journeys: JsonRecord[];
  library_items: JsonRecord[];
  activity_versions: JsonRecord[];
};

export type ParticipantExtensionsWorkspace = {
  organization_id: string;
  entrepreneur_id: string | null;
  settings: JsonRecord | null;
  pending_legal_documents: JsonRecord[];
  b2b_pages: JsonRecord[];
  rewards: {
    engagement_points: number;
    converted_source_points: number;
    convertible_engagement_points: number;
    reward_balance: number;
    settings: JsonRecord;
    catalog: JsonRecord[];
    redemptions: JsonRecord[];
    ledger: JsonRecord[];
  };
  deliveries: JsonRecord[];
  optional_diagnostics: JsonRecord[];
};

export const extensionsRuntime = {
  adminWorkspace(actorUserAccountId: string, organizationId: string) {
    return invokeServerRpc<AdminExtensionsWorkspace>("get_admin_extensions_workspace", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    });
  },

  saveAdmin(input: {
    actorUserAccountId: string;
    organizationId: string;
    resourceType: string;
    payload: JsonRecord;
    idempotencyKey: string;
  }) {
    return invokeServerRpc<JsonRecord>("save_admin_extension", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_resource_type: input.resourceType,
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
    });
  },

  participantWorkspace(actorUserAccountId: string) {
    return invokeServerRpc<ParticipantExtensionsWorkspace>("get_participant_extensions", {
      p_actor_user_account_id: actorUserAccountId,
    });
  },

  performParticipant(input: {
    actorUserAccountId: string;
    action: string;
    payload: JsonRecord;
    idempotencyKey: string;
  }) {
    return invokeServerRpc<JsonRecord>("perform_participant_extension", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_action: input.action,
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
    });
  },
};
