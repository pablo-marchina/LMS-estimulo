import "server-only";
import type {
  ActivityComment,
  ActivityComments,
  IdentityContext,
  JourneyState,
  OperatorActivityComment,
  OperatorActivityComments,
  OperatorInstances,
  OperatorWorkspace,
  ParticipantExperience,
  ParticipantJourneys,
  RpcEnvelope
} from "@/lib/journey-runtime/contracts";
import { legacyRpcArguments } from "@/lib/journey-runtime/legacy-rpc-arguments";
import { invokeServerRpc, ServerRpcError } from "@/lib/rpc/server-invoke";

export class JourneyRpcError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "JourneyRpcError";
  }
}

async function invoke<T>(name: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invokeServerRpc<T>(name, args);
  } catch (error) {
    if (error instanceof ServerRpcError) throw new JourneyRpcError(error.code, error.message);
    throw error;
  }
}

export type ConfigurableProductPersistenceInput = {
  actorUserAccountId: string;
  organizationId: string;
  journeyInstanceId: string | null;
  submission: Record<string, unknown>;
  assignment: Record<string, unknown>;
  activationBatch: Record<string, unknown> | null;
  evidence: Record<string, unknown>;
  crmProjections: Array<Record<string, unknown>>;
  idempotencyKey: string;
};

export type ConfigurableProductPersistenceData = {
  submission_id: string;
  result_id: string;
  assignment_id: string;
  new_submission: boolean;
  response_count: number;
  activation_count: number;
  projection_count: number;
};

export const configurableProductRuntime = {
  persistResult: (input: ConfigurableProductPersistenceInput) =>
    invoke<RpcEnvelope<ConfigurableProductPersistenceData>>("persist_configurable_product_result", {
      p_actor_user_account_id: input.actorUserAccountId,
      p_organization_id: input.organizationId,
      p_journey_instance_id: input.journeyInstanceId,
      p_submission: input.submission,
      p_assignment: input.assignment,
      p_activation_batch: input.activationBatch,
      p_evidence: input.evidence,
      p_crm_projections: input.crmProjections,
      p_idempotency_key: input.idempotencyKey
    })
};

export type EligibleJourney = { journey_version_id: string; title: string; description: string | null; open_to_all: boolean };

export const journeyRuntime = {
  listActivityComments: (actor: string, stepInstanceId: string) => invoke<ActivityComments>("list_activity_comments", {
    p_actor_user_account_id: actor,
    p_step_instance_id: stepInstanceId
  }),

  createActivityComment: (actor: string, stepInstanceId: string, body: string, key: string) =>
    invoke<RpcEnvelope<ActivityComment>>("create_activity_comment", {
      p_actor_user_account_id: actor,
      p_step_instance_id: stepInstanceId,
      p_body: body,
      p_idempotency_key: key
    }),

  listOperatorActivityComments: (actor: string, organizationId: string, limit = 50) =>
    invoke<OperatorActivityComments>("list_operator_activity_comments", {
      p_actor_user_account_id: actor,
      p_organization_id: organizationId,
      p_limit: limit
    }),

  moderateActivityComment: (
    actor: string,
    organizationId: string,
    commentId: string,
    status: "visible" | "hidden",
    reason: string,
    key: string
  ) => invoke<RpcEnvelope<OperatorActivityComment & { changed: boolean }>>("moderate_activity_comment", {
    p_actor_user_account_id: actor,
    p_organization_id: organizationId,
    p_comment_id: commentId,
    p_status: status,
    p_reason: reason,
    p_idempotency_key: key
  }),

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

  selfEnroll: (actor: string, journeyVersionId: string, key: string) =>
    invoke<RpcEnvelope<{ enrollment_id: string; journey_instance_id: string }>>("e14_self_enroll", {
      p_actor_user_account_id: actor,
      p_journey_version_id: journeyVersionId,
      p_idempotency_key: key
    }),

  listEligibleJourneys: (actor: string) => invoke<EligibleJourney[]>("e14_list_eligible_journeys", {
    p_actor_user_account_id: actor
  }),

  startJourney: (actor: string, instanceId: string, version: number, key: string) => invoke<RpcEnvelope<JourneyState>>("e14_start_journey", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: instanceId,
    p_expected_aggregate_version: version,
    p_idempotency_key: key
  }),

  ensureDefaultPath: (actor: string, instanceId: string, key: string) => invoke<RpcEnvelope<{
    journey_instance_id: string;
    path_assignment_id: string;
    path_template_id: string;
    path_code: string;
    first_step_instance_id: string;
    step_count: number;
  }>>("ensure_participant_default_path", {
    p_actor_user_account_id: actor,
    p_journey_instance_id: instanceId,
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
    legacyRpcArguments.completeDiagnostic({
      actorUserAccountId: actor,
      sessionId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  startActivity: (actor: string, stepId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_start_activity",
    legacyRpcArguments.startActivity({
      actorUserAccountId: actor,
      stepInstanceId: stepId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  acknowledgeSection: (actor: string, sessionId: string, sectionCode: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_acknowledge_section",
    legacyRpcArguments.acknowledgeSection({
      actorUserAccountId: actor,
      activitySessionId: sessionId,
      sectionCode,
      acknowledged: true,
      idempotencyKey: key
    })
  ),

  startQuickCheck: (actor: string, stepId: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_start_quick_check",
    legacyRpcArguments.startQuickCheck({
      actorUserAccountId: actor,
      stepInstanceId: stepId,
      idempotencyKey: key
    })
  ),

  recordQuickCheckAnswer: (actor: string, attemptId: string, questionId: string, optionCode: string, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_record_quick_check_answer",
    legacyRpcArguments.recordQuickCheckAnswer({
      actorUserAccountId: actor,
      attemptId,
      questionId,
      optionCode,
      idempotencyKey: key
    })
  ),

  submitQuickCheck: (actor: string, attemptId: string, version: number, key: string) => invoke<RpcEnvelope<unknown>>(
    "e14_submit_quick_check",
    legacyRpcArguments.submitQuickCheck({
      actorUserAccountId: actor,
      attemptId,
      expectedAggregateVersion: version,
      idempotencyKey: key
    })
  ),

  getParticipantState: (actor: string, instanceId: string) => invoke<JourneyState>(
    "e14_get_participant_state",
    legacyRpcArguments.getParticipantState({
      actorUserAccountId: actor,
      journeyInstanceId: instanceId
    })
  ),

  getOperatorResult: (actor: string, organizationId: string, instanceId: string) => invoke<Record<string, unknown>>(
    "e14_get_operator_result",
    legacyRpcArguments.getOperatorResult({
      actorUserAccountId: actor,
      organizationId,
      journeyInstanceId: instanceId
    })
  )
};
