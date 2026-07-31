import "server-only";

import { invokeExtensionsGateway } from "@/lib/extensions/gateway";

export type JsonRecord = Record<string, unknown>;

export type ExtensionParticipant = {
  user_account_id: string;
  entrepreneur_id: string | null;
  email: string;
  name: string;
};

export type BehaviorScoreDimensionConfiguration = {
  code: string;
  name: string;
  metric: "event_count" | "active_days" | "depth_events" | "completion_events" | "autonomy_events" | "quality_average" | "active_weeks";
  weight: number;
  multiplier: number;
  offset: number;
  cap: number;
};

export type BehaviorScoreClassificationConfiguration = {
  code: string;
  label: string;
  minimum: number;
  maximum: number;
};

export type BehaviorScoreConfiguration = {
  formula: "weighted_average" | "weighted_sum";
  normalization: { minimum: number; maximum: number };
  confidence: { events_for_full_confidence: number };
  dimensions: BehaviorScoreDimensionConfiguration[];
  classifications: BehaviorScoreClassificationConfiguration[];
};

export type AdminAiGradingProvider = {
  configured: boolean;
  provider_name: string;
  endpoint_url: string;
  model_name: string;
  api_style: "openai_chat_completions";
  api_key_last_four: string;
  status: "active" | "inactive";
  updated_at?: string;
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
  behavior_score_configuration: BehaviorScoreConfiguration;
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
    return invokeExtensionsGateway<AdminExtensionsWorkspace>("get_admin_extensions_workspace", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    });
  },

  getAiGradingProvider(actorUserAccountId: string, organizationId: string) {
    return invokeExtensionsGateway<AdminAiGradingProvider>("get_admin_ai_grading_provider", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
    });
  },

  saveAiGradingProvider(input: {
    actorUserAccountId: string;
    organizationId: string;
    payload: JsonRecord;
    idempotencyKey: string;
  }) {
    return invokeExtensionsGateway<JsonRecord>("save_ai_grading_provider", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
    });
  },

  saveAdmin(input: {
    actorUserAccountId: string;
    organizationId: string;
    resourceType: string;
    payload: JsonRecord;
    idempotencyKey: string;
  }) {
    return invokeExtensionsGateway<JsonRecord>("save_admin_extension", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_resource_type: input.resourceType,
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
    });
  },

  participantWorkspace(actorUserAccountId: string) {
    return invokeExtensionsGateway<ParticipantExtensionsWorkspace>("get_participant_extensions", {
      p_actor_user_account_id: actorUserAccountId,
    });
  },

  performParticipant(input: {
    actorUserAccountId: string;
    action: string;
    payload: JsonRecord;
    idempotencyKey: string;
  }) {
    return invokeExtensionsGateway<JsonRecord>("perform_participant_extension", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_action: input.action,
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
    });
  },
};
