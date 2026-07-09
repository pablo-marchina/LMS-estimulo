import "server-only";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import type {
  IdentityContext,
  JourneyState,
  OperatorInstances,
  ParticipantExperience,
  ParticipantJourneys,
  RpcEnvelope
} from "@/lib/e14/contracts";

export class E14RpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "E14RpcError";
  }
}

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = createPrivilegedClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw new E14RpcError(error.code ?? "E14_RPC_ERROR", error.message);
  return data as T;
}

export const e14 = {
  resolveIdentity: (input: {
    provider: string;
    issuer: string;
    subject: string;
    email: string;
    emailVerified: boolean;
    claimsFingerprint: string;
  }) => invoke<IdentityContext>("e14_resolve_identity", {
    p_provider: input.provider,
    p_issuer: input.issuer,
    p_subject: input.subject,
    p_email_normalized: input.email,
    p_email_verified: input.emailVerified,
    p_claims_fingerprint: input.claimsFingerprint
  }),

  listParticipantJourneys: (actor: string) => invoke<ParticipantJourneys>("e14_list_participant_journeys", {
    p_actor_user_account_id: actor
  }),

  getParticipantExperience: (actor: string, journeyInstanceId: string) => invoke<ParticipantExperience>("e14_get_participant_experience", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: journeyInstanceId
  }),

  listOperatorInstances: (actor: string, organizationId: string) => invoke<OperatorInstances>("e14_list_operator_instances", {
    p_actor_user_account_id: actor,
    p_organization_id: organizationId
  }),

  publishVertical: (actor: string, organizationId: string, journeyVersionId: string, contentHash: string, key: string) =>
    invoke<RpcEnvelope<unknown>>("e14_publish_vertical", {
      p_actor_user_account_id: actor,
      p_organization_id: organizationId,
      p_journey_version_id: journeyVersionId,
      p_expected_content_hash: contentHash,
      p_idempotency_key: key
    }),

  createEnrollment: (actor: string, organizationId: string, entrepreneurId: string, journeyVersionId: string, source: string, key: string) =>
    invoke<RpcEnvelope<unknown>>("e14_create_enrollment", {
      p_actor_user_account_id: actor,
      p_organization_id: organizationId,
      p_entrepreneur_id: entrepreneurId,
      p_journey_version_id: journeyVersionId,
      p_source: source,
      p_idempotency_key: key
    }),

  startJourney: (actor: string, instanceId: string, version: number, key: string) => invoke<RpcEnvelope<JourneyState>>("e14_start_journey", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: instanceId,
    p_expected_aggregate_version: version,
    p_idempotency_key: key
  }),

  startDiagnostic: (actor: string, instanceId: string, diagnosticVersionId: string, key: string) => invoke<RpcEnvelope<unknown>>("e14_start_diagnostic", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: instanceId,
    p_diagnostic_version_id: diagnosticVersionId,
    p_idempotency_key: key
  }),

  recordDiagnosticResponse: (actor: string, sessionId: string, itemId: string, optionCode: string, revision: number, key: string) =>
    invoke<RpcEnvelope<unknown>>("e14_record_diagnostic_response", {
      p_actor_user_account_id: actor,
      p_session_id: sessionId,
      p_item_id: itemId,
      p_option_code: optionCode,
      p_revision: revision,
      p_response_time_ms: null,
      p_idempotency_key: key
    }),

  completeDiagnostic: (actor: string, sessionId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>("e14_complete_diagnostic", {
    p_actor_user_account_id: actor,
    p_session_id: sessionId,
    p_expected_aggregate_version: version,
    p_idempotency_key: key
  }),

  startActivity: (actor: string, stepId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>("e14_start_activity", {
    a: actor,
    b: stepId,
    c: version,
    d: key
  }),

  acknowledgeSection: (actor: string, sessionId: string, sectionCode: string, key: string) => invoke<RpcEnvelope<unknown>>("e14_acknowledge_section", {
    a: actor,
    b: sessionId,
    c: sectionCode,
    d: true,
    e: key
  }),

  startQuickCheck: (actor: string, stepId: string, key: string) => invoke<RpcEnvelope<unknown>>("e14_start_quick_check", {
    a: actor,
    b: stepId,
    c: key
  }),

  recordQuickCheckAnswer: (actor: string, attemptId: string, questionId: string, optionCode: string, key: string) => invoke<RpcEnvelope<unknown>>("e14_record_quick_check_answer", {
    a: actor,
    b: attemptId,
    c: questionId,
    d: optionCode,
    e: key
  }),

  submitQuickCheck: (actor: string, attemptId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>("e14_submit_quick_check", {
    a: actor,
    b: attemptId,
    c: version,
    d: key
  }),

  getParticipantState: (actor: string, instanceId: string) => invoke<JourneyState>("e14_get_participant_state", { a: actor, b: instanceId }),
  getOperatorResult: (actor: string, organizationId: string, instanceId: string) => invoke<Record<string, unknown>>("e14_get_operator_result", {
    a: actor,
    b: organizationId,
    c: instanceId
  })
};
