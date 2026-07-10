import type {
  HubSpotSnapshot,
  HubSpotSnapshotQuery,
  HubSpotWriteCommand,
  JsonObject
} from "../hubspot/contracts.js";
import type { HubSpotDataGateway } from "../hubspot/gateway.js";
import {
  readVerifiedHubSpotSnapshot,
  writeAndConfirmHubSpotRecord,
  type HubSpotRetryPolicy,
  type HubSpotVerificationContext
} from "../hubspot/write-readback-use.js";
import { evaluateActivationRules } from "./activation-engine.js";
import { createArchetypeAssignment } from "./classification-engine.js";
import {
  type ActivationExecutionBatchPayload,
  type ArchetypeAssignmentPayload,
  type AssignmentOverride,
  type AssignmentReason,
  type ConfigurableProductResult,
  type DecisionRequestPayload,
  type FormSubmissionPayload,
  type HubSpotWriteTarget,
  type ProductConfigurationPayload
} from "./contracts.js";
import { ConfigurableProductError } from "./validation.js";

export type HubSpotRecordInput<T extends JsonObject> =
  | {
      mode: "write";
      command: HubSpotWriteCommand<T>;
    }
  | {
      mode: "read";
      query: HubSpotSnapshotQuery;
    };

export type SubmissionInput = HubSpotRecordInput<FormSubmissionPayload>;

export type ConfigurableProductExecution = {
  gateway: HubSpotDataGateway;
  configurationQuery: HubSpotSnapshotQuery;
  submissionInput: SubmissionInput;
  decisionRequestTarget?: HubSpotWriteTarget;
  assignmentTarget: HubSpotWriteTarget;
  activationTarget: HubSpotWriteTarget | null;
  assignmentId: string;
  activationBatchId: string;
  reason: AssignmentReason;
  supersedesAssignmentId: string | null;
  override: AssignmentOverride | null;
  overrideArchetypeVersionId: string | null;
  now?: () => Date;
  maxSnapshotAgeMs?: number;
  retry?: HubSpotRetryPolicy;
};

function decisionRequestWrite(
  target: HubSpotWriteTarget,
  payload: DecisionRequestPayload
): HubSpotWriteCommand<DecisionRequestPayload> {
  return {
    idempotencyKey: target.idempotencyKey,
    kind: "collected_data",
    objectType: target.objectType,
    objectId: target.objectId,
    expectedVersion: target.expectedVersion,
    payload
  };
}

function assignmentWrite(
  target: HubSpotWriteTarget,
  payload: ArchetypeAssignmentPayload
): HubSpotWriteCommand<ArchetypeAssignmentPayload> {
  return {
    idempotencyKey: target.idempotencyKey,
    kind: "business_result",
    objectType: target.objectType,
    objectId: target.objectId,
    expectedVersion: target.expectedVersion,
    payload
  };
}

function activationWrite(
  target: HubSpotWriteTarget,
  payload: ActivationExecutionBatchPayload
): HubSpotWriteCommand<ActivationExecutionBatchPayload> {
  return {
    idempotencyKey: target.idempotencyKey,
    kind: "activation_execution",
    objectType: target.objectType,
    objectId: target.objectId,
    expectedVersion: target.expectedVersion,
    payload
  };
}

async function resolveInput<T extends JsonObject>(
  context: HubSpotVerificationContext,
  input: HubSpotRecordInput<T>
): Promise<HubSpotSnapshot<T>> {
  return input.mode === "write"
    ? writeAndConfirmHubSpotRecord(context, input.command)
    : readVerifiedHubSpotSnapshot<T>(context, input.query);
}

export async function executeConfigurableProductFlow(
  execution: ConfigurableProductExecution
): Promise<ConfigurableProductResult> {
  const context: HubSpotVerificationContext = {
    gateway: execution.gateway,
    now: execution.now ?? (() => new Date()),
    maxSnapshotAgeMs: execution.maxSnapshotAgeMs ?? 60_000,
    retry: execution.retry ?? { maxAttempts: 3, delayMs: 0 }
  };

  const configurationSnapshot = await readVerifiedHubSpotSnapshot<ProductConfigurationPayload>(
    context,
    execution.configurationQuery
  );
  const submissionSnapshot = await resolveInput(context, execution.submissionInput);

  const decisionRequestTarget = execution.decisionRequestTarget ?? {
    objectType: "logical_decision_request",
    objectId: `decision-request-${execution.assignmentId}`,
    idempotencyKey: `${execution.assignmentTarget.idempotencyKey}:decision-request`,
    expectedVersion: "0"
  };
  const decisionRequestSnapshot = await writeAndConfirmHubSpotRecord(
    context,
    decisionRequestWrite(decisionRequestTarget, {
      requestId: decisionRequestTarget.objectId,
      reason: execution.reason,
      supersedesAssignmentId: execution.supersedesAssignmentId,
      override: execution.override,
      overrideArchetypeVersionId: execution.overrideArchetypeVersionId,
      requestedAt: context.now().toISOString()
    })
  );
  const decisionRequest = decisionRequestSnapshot.payload;

  const createdAt = context.now().toISOString();
  const assignment = createArchetypeAssignment(
    {
      assignmentId: execution.assignmentId,
      submissionObjectId: submissionSnapshot.source.objectId,
      reason: decisionRequest.reason,
      supersedesAssignmentId: decisionRequest.supersedesAssignmentId,
      configuration: configurationSnapshot.payload,
      submission: submissionSnapshot.payload,
      inputSnapshotHashes: [
        configurationSnapshot.source.snapshotHash,
        submissionSnapshot.source.snapshotHash
      ],
      decisionRequestSnapshotHash: decisionRequestSnapshot.source.snapshotHash,
      createdAt,
      override: decisionRequest.override
    },
    decisionRequest.overrideArchetypeVersionId
  );

  const assignmentSnapshot = await writeAndConfirmHubSpotRecord(
    context,
    assignmentWrite(execution.assignmentTarget, assignment)
  );

  const activationBatch = evaluateActivationRules({
    batchId: execution.activationBatchId,
    configuration: configurationSnapshot.payload,
    submission: submissionSnapshot.payload,
    assignment: assignmentSnapshot.payload,
    inputSnapshotHashes: [
      configurationSnapshot.source.snapshotHash,
      submissionSnapshot.source.snapshotHash,
      decisionRequestSnapshot.source.snapshotHash,
      assignmentSnapshot.source.snapshotHash
    ],
    executedAt: context.now().toISOString()
  });

  let activationSnapshot: HubSpotSnapshot<ActivationExecutionBatchPayload> | null = null;
  if (activationBatch !== null) {
    if (execution.activationTarget === null) {
      throw new ConfigurableProductError(
        "ACTIVATION_TARGET_REQUIRED",
        "Matched activation rules must be persisted and confirmed in HubSpot."
      );
    }
    activationSnapshot = await writeAndConfirmHubSpotRecord(
      context,
      activationWrite(execution.activationTarget, activationBatch)
    );
  }

  return {
    assignment: assignmentSnapshot.payload,
    activationBatch: activationSnapshot?.payload ?? null,
    evidence: {
      configurationSource: configurationSnapshot.source,
      submissionSource: submissionSnapshot.source,
      decisionRequestSource: decisionRequestSnapshot.source,
      assignmentSource: assignmentSnapshot.source,
      activationSource: activationSnapshot?.source ?? null
    }
  };
}
