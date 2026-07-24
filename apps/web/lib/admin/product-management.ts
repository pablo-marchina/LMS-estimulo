import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export type TrilhaAula = {
  step_id: string;
  code: string;
  position: number;
  is_required: boolean;
  activity_version_id: string;
  title: string;
  description: string | null;
  activity_type: string;
  configuration: Record<string, unknown>;
  assessment: {
    spec_id: string;
    passing_score: number | null;
    max_attempts: number | null;
    questions: Array<{
      id: string;
      code: string;
      prompt: string;
      position: number;
      options: Array<{ id: string; code: string; label: string; is_correct: boolean; position: number }>;
    }>;
  } | null;
  practice: { submission_mode: string; allowed_evidence_types: string[]; review_required: boolean } | null;
};

export type Trilha = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  position: number;
  status: string;
  badge: { badge_version_id: string; title: string; description: string | null } | null;
  aulas: TrilhaAula[];
};

export type VersionSummary = {
  id: string;
  version_number: number;
  status: string;
  title?: string | null;
  description?: string | null;
  configuration?: Record<string, unknown>;
  content_hash?: string;
  published_at?: string | null;
  dimensions?: Array<{ id: string; code: string; name: string; description: string | null; minimum_answer_ratio: number; position: number }>;
  items?: Array<{
    id: string; code: string; item_type: string; prompt: string; position: number; is_required: boolean; dimension_code: string | null;
    options: Array<{ id: string; code: string; label: string; value: { score?: number }; position: number }>;
  }>;
  eligible_archetype_codes?: string[] | null;
  trilhas?: Trilha[];
  [key: string]: unknown;
};

export type DefinitionSummary = {
  definition_id: string;
  code: string;
  name: string;
  status: string;
  versions: VersionSummary[];
  [key: string]: unknown;
};

export type PathSummary = {
  id: string;
  journey_version_id: string;
  code: string;
  name: string;
  description: string | null;
  is_default: boolean;
  status: string;
  steps: Array<Record<string, unknown>>;
};

export type AdminProductWorkspace = {
  organization_id: string;
  programs: Array<{ id: string; code: string; name: string; status: string }>;
  journeys: DefinitionSummary[];
  activities: DefinitionSummary[];
  paths: PathSummary[];
  rules: DefinitionSummary[];
  diagnostics: DefinitionSummary[];
  point_rules: DefinitionSummary[];
  badges: DefinitionSummary[];
  certificates: DefinitionSummary[];
};

export type AdminReportingDashboard = {
  organization_id: string;
  generated_at: string;
  metrics: {
    participants: number;
    enrollments: number;
    completed_journeys: number;
    average_progress: number;
    points_issued: number;
    comments: number;
    practice_submissions: number;
    average_utility_rating: number;
    badges_awarded: number;
    certificates_issued: number;
  };
  journeys: Array<{
    journey: string;
    version: number;
    enrollments: number;
    completed: number;
    average_progress: number;
  }>;
  recent_events: Array<{
    event_name: string;
    occurred_at: string;
    aggregate_type: string | null;
    aggregate_id: string | null;
  }>;
};

export async function getAdminProductWorkspace(actorUserAccountId: string, organizationId: string) {
  return invokeServerRpc<AdminProductWorkspace>("get_admin_product_workspace", {
    p_actor_user_account_id: actorUserAccountId,
    p_organization_id: organizationId,
  });
}

export async function saveAdminProductResource(input: {
  actorUserAccountId: string;
  organizationId: string;
  resourceType: "journey" | "activity" | "path_step" | "path_template" | "rule" | "diagnostic" | "point_rule" | "badge" | "certificate";
  payload: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return invokeServerRpc<Record<string, unknown>>("save_admin_product_resource", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_resource_type: input.resourceType,
    p_payload: input.payload,
    p_idempotency_key: input.idempotencyKey,
  });
}

export async function getAdminReportingDashboard(actorUserAccountId: string, organizationId: string) {
  return invokeServerRpc<AdminReportingDashboard>("get_admin_reporting_dashboard", {
    p_actor_user_account_id: actorUserAccountId,
    p_organization_id: organizationId,
  });
}
