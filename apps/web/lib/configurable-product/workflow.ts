import type {
  HubSpotSnapshot,
  HubSpotSnapshotQuery,
  HubSpotWriteCommand
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
  type FormSubmissionPayload,
  type HubSpotWriteTarget,
  type ProductConfigurationPayload
} from "./contracts.js";
import { ConfigurableProductError } from "./validation.js";

export type ConfigurableProductExecution = {
  gateway: HubSpotDataGateway;
  configurationQuery: HubSpotSnapshotQuery;
  submissionWrite: HubSpotWriteCommand<FormSubmissionPayload>;
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
  const submissionSnapshot = await writeAndConfirmHubSpotRecord(
    context,
    execution.submissionWrite
  );

  const createdAt = context.now().toISOString();
  const assignment = createArchetypeAssignment(
    {
      assignmentId: execution.assignmentId,
      submissionObjectId: submissionSnapshot.source.objectId,
      reason: execution.reason,
      supersedesAssignmentId: execution.supersedesAssignmentId,
      configuration: configurationSnapshot.payload,
      submission: submissionSnapshot.payload,
      inputSnapshotHashes: [
        configurationSnapshot.source.snapshotHash,
        submissionSnapshot.source.snapshotHash
      ],
      createdAt,
      override: execution.override
    },
    execution.overrideArchetypeVersionId
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
      assignmentSource: assignmentSnapshot.source,
      activationSource: activationSnapshot?.source ?? null
    }
  };
}
