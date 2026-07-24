import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { RpcEnvelope } from "@/lib/journey-runtime/contracts";

export type IdentityContactCandidate = {
  id?: string;
  external_object_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  [key: string]: unknown;
};

export type IdentityResolutionCase = {
  id: string;
  user_account_id: string;
  entrepreneur_id: string | null;
  email: string;
  preferred_name: string | null;
  legal_name: string | null;
  phone_e164: string | null;
  status: "pending" | "awaiting_integration" | "queued" | "resolved" | "dismissed";
  reason_code: "no_match" | "multiple_matches" | "conflict_blocked" | "manual_review";
  candidate_contacts: IdentityContactCandidate[];
  matched_identifiers: Record<string, unknown>;
  resolution_action: "link_existing" | "create_new" | "dismiss" | null;
  selected_external_object_id: string | null;
  queued_sync_job_id: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type IdentityResolutionWorkspace = {
  organization_id: string;
  counts: { pending: number; awaiting_integration: number; queued: number };
  cases: IdentityResolutionCase[];
};

export const identityResolutionRuntime = {
  list: (actorUserAccountId: string, organizationId: string, status?: IdentityResolutionCase["status"] | null) =>
    invokeServerRpc<IdentityResolutionWorkspace>("list_admin_identity_resolution_cases", {
      p_actor_user_account_id: actorUserAccountId,
      p_organization_id: organizationId,
      p_status: status ?? null,
    }),

  resolve: (input: {
    actorUserAccountId: string;
    organizationId: string;
    caseId: string;
    action: "link_existing" | "create_new" | "dismiss";
    externalObjectId?: string | null;
    note?: string | null;
    idempotencyKey: string;
  }) => invokeServerRpc<RpcEnvelope<{
    case_id: string;
    status: IdentityResolutionCase["status"];
    action: string;
    external_object_id: string | null;
    sync_job_id: string | null;
  }>>("resolve_admin_identity_resolution_case", {
    p_actor_user_account_id: input.actorUserAccountId,
    p_organization_id: input.organizationId,
    p_case_id: input.caseId,
    p_action: input.action,
    p_external_object_id: input.externalObjectId ?? null,
    p_note: input.note ?? null,
    p_idempotency_key: input.idempotencyKey,
  }),
};
