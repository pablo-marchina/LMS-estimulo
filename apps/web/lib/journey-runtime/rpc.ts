import "server-only";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import type {
  IdentityContext,
  JourneyState,
  OperatorInstances,
  OperatorWorkspace,
  ParticipantExperience,
  ParticipantJourneys,
  RpcEnvelope
} from "@/lib/e14/contracts";
import { legacyE14RpcArguments } from "@/lib/e14/legacy-rpc-arguments";

export class JourneyRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "JourneyRpcError";
  }
}

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const client = createPrivilegedClient();
  const { data, error } = await client.rpc(name, args);
  if (error) throw new JourneyRpcError(error.code ?? "E14_RPC_ERROR", error.message);
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

  getOperatorWorkspace: (actor: string, organizationId: string) => invoke<OperatorWorkspace>("e14_get_operator_workspace", {
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

  completeDiagnostic: (actor: string, sessionId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_complete_diagnostic",
    legacyE14RpcArguments.completeDiagnostic({
      actorUserAccountId: actor,
      sessionId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  startActivity: (actor: string, stepId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_start_activity",
    legacyE14RpcArguments.startActivity({
      actorUserAccountId: actor,
      stepInstanceId: stepId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  acknowledgeSection: (actor: string, sessionId: string, sectionCode: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_acknowledge_section",
    legacyE14RpcArguments.acknowledgeSection({
      actorUserAccountId: actor,
      activitySessionId: sessionId,
      sectionCode,
      acknowledged: true,
      idempotencyKey: key
    })
  ),

  startQuickCheck: (actor: string, stepId: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_start_quick_check",
    legacyE14RpcArguments.startQuickCheck({
      actorUserAccountId: actor,
      stepInstanceId: stepId,
      idempotencyKey: key
    })
  ),

  recordQuickCheckAnswer: (actor: string, attemptId: string, questionId: string, optionCode: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_record_quick_check_answer",
    legacyE14RpcArguments.recordQuickCheckAnswer({
      actorUserAccountId: actor,
      attemptId,
      questionId,
      optionCode,
      idempotencyKey: key
    })
  ),

  submitQuickCheck: (actor: string, attemptId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_submit_quick_check",
    legacyE14RpcArguments.submitQuickCheck({
      actorUserAccountId: actor,
      attemptId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  getParticipantState: (actor: string, instanceId: string) => invoke<JourneyState>(
    "e14_get_participant_state",
    legacyE14RpcArguments.getParticipantState({
      actorUserAccountId: actor,
      journeyInstanceId: instanceId
    })
  ),

  getOperatorResult: (actor: string, organizationId: string, instanceId: string) => invoke<Record<string, unknown>>(
    "e14_get_operator_result",
    legacyE14RpcArguments.getOperatorResult({
      actorUserAccountId: actor,
      organizationId,
      journeyInstanceId: instanceId
    })
  )
};
