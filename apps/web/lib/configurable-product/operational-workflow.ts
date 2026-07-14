import type { JsonObject } from "../hubspot/contracts.js";
import { hashJson } from "../hubspot/hashing.js";
import { evaluateActivationRules } from "./activation-engine.js";
import { createArchetypeAssignment } from "./classification-engine.js";
import type {
  ActivationExecutionBatchPayload,
  ArchetypeAssignmentPayload,
  AssignmentOverride,
  AssignmentReason,
  DecisionRequestPayload,
  FormSubmissionPayload,
  ProductConfigurationPayload
} from "./contracts.js";

export type CrmProjectionType =
  | "diagnostic_submission_summary"
  | "archetype_assignment_summary"
  | "activation_summary";

export type CrmProjectionCommand = {
  projectionId: string;
  projectionType: CrmProjectionType;
  subjectObjectId: string;
  idempotencyKey: string;
  sourceRecordHash: string;
  payload: JsonObject;
  requiresReadback: boolean;
  createdAt: string;
};

export type OperationalProductEvidence = {
  configurationHash: string;
  submissionHash: string;
  decisionRequestHash: string;
  assignmentHash: string;
  activationHash: string | null;
};

export type OperationalConfigurableProductExecution = {
  configuration: ProductConfigurationPayload;
  submission: FormSubmissionPayload;
  assignmentId: string;
  activationBatchId: string;
  reason: AssignmentReason;
  supersedesAssignmentId: string | null;
  override: AssignmentOverride | null;
  overrideArchetypeVersionId: string | null;
  now?: () => Date;
};

export type OperationalConfigurableProductResult = {
  assignment: ArchetypeAssignmentPayload;
  activationBatch: ActivationExecutionBatchPayload | null;
  evidence: OperationalProductEvidence;
  crmProjections: CrmProjectionCommand[];
};

function asJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function hashRecord(value: unknown): string {
  return hashJson(asJsonObject(value));
}

function buildDecisionRequest(
  execution: OperationalConfigurableProductExecution,
  requestedAt: string
): DecisionRequestPayload {
  return {
    requestId: `decision-request-${execution.assignmentId}`,
    reason: execution.reason,
    supersedesAssignmentId: execution.supersedesAssignmentId,
    override: execution.override,
    overrideArchetypeVersionId: execution.overrideArchetypeVersionId,
    requestedAt
  };
}

function submissionProjection(
  execution: OperationalConfigurableProductExecution,
  submissionHash: string,
  createdAt: string
): CrmProjectionCommand {
  return {
    projectionId: `crm-projection-submission-${execution.submission.submissionId}`,
    projectionType: "diagnostic_submission_summary",
    subjectObjectId: execution.submission.participantObjectId,
    idempotencyKey: `crm:submission:${execution.submission.submissionId}:${submissionHash}`,
    sourceRecordHash: submissionHash,
    payload: {
      submissionId: execution.submission.submissionId,
      participantObjectId: execution.submission.participantObjectId,
      formVersionId: execution.submission.formVersionId,
      submittedAt: execution.submission.submittedAt
    },
    requiresReadback: false,
    createdAt
  };
}

function assignmentProjection(
  execution: OperationalConfigurableProductExecution,
  assignment: ArchetypeAssignmentPayload,
  assignmentHash: string,
  createdAt: string
): CrmProjectionCommand {
  return {
    projectionId: `crm-projection-assignment-${assignment.assignmentId}`,
    projectionType: "archetype_assignment_summary",
    subjectObjectId: execution.submission.participantObjectId,
    idempotencyKey: `crm:assignment:${assignment.assignmentId}:${assignmentHash}`,
    sourceRecordHash: assignmentHash,
    payload: {
      assignmentId: assignment.assignmentId,
      submissionId: execution.submission.submissionId,
      participantObjectId: execution.submission.participantObjectId,
      formVersionId: assignment.formVersionId,
      classificationPolicyVersionId: assignment.classificationPolicyVersionId,
      archetypeVersionId: assignment.archetypeVersionId,
      reason: assignment.reason,
      supersedesAssignmentId: assignment.supersedesAssignmentId,
      createdAt: assignment.createdAt,
      scores: assignment.scores.map((score) => ({
        archetypeVersionId: score.archetypeVersionId,
        score: score.score
      }))
    },
    requiresReadback: false,
    createdAt
  };
}

function activationProjection(
  execution: OperationalConfigurableProductExecution,
  activationBatch: ActivationExecutionBatchPayload,
  activationHash: string,
  createdAt: string
): CrmProjectionCommand {
  return {
    projectionId: `crm-projection-activation-${activationBatch.batchId}`,
    projectionType: "activation_summary",
    subjectObjectId: execution.submission.participantObjectId,
    idempotencyKey: `crm:activation:${activationBatch.batchId}:${activationHash}`,
    sourceRecordHash: activationHash,
    payload: {
      batchId: activationBatch.batchId,
      assignmentId: activationBatch.assignmentId,
      createdAt: activationBatch.createdAt,
      executions: activationBatch.executions.map((item) => ({
        executionId: item.executionId,
        activationRuleVersionId: item.activationRuleVersionId,
        actionType: item.action.type,
        status: item.status,
        executedAt: item.executedAt
      }))
    },
    requiresReadback: false,
    createdAt
  };
}

export function executeOperationalConfigurableProductFlow(
  execution: OperationalConfigurableProductExecution
): OperationalConfigurableProductResult {
  const createdAt = (execution.now ?? (() => new Date()))().toISOString();
  const decisionRequest = buildDecisionRequest(execution, createdAt);

  const configurationHash = hashRecord(execution.configuration);
  const submissionHash = hashRecord(execution.submission);
  const decisionRequestHash = hashRecord(decisionRequest);

  const assignment = createArchetypeAssignment(
    {
      assignmentId: execution.assignmentId,
      submissionObjectId: execution.submission.submissionId,
      reason: decisionRequest.reason,
      supersedesAssignmentId: decisionRequest.supersedesAssignmentId,
      configuration: execution.configuration,
      submission: execution.submission,
      inputSnapshotHashes: [configurationHash, submissionHash],
      decisionRequestSnapshotHash: decisionRequestHash,
      createdAt,
      override: decisionRequest.override
    },
    decisionRequest.overrideArchetypeVersionId
  );
  const assignmentHash = hashRecord(assignment);

  const activationBatch = evaluateActivationRules({
    batchId: execution.activationBatchId,
    configuration: execution.configuration,
    submission: execution.submission,
    assignment,
    inputSnapshotHashes: [
      configurationHash,
      submissionHash,
      decisionRequestHash,
      assignmentHash
    ],
    executedAt: createdAt
  });
  const activationHash = activationBatch === null ? null : hashRecord(activationBatch);

  const crmProjections: CrmProjectionCommand[] = [
    submissionProjection(execution, submissionHash, createdAt),
    assignmentProjection(execution, assignment, assignmentHash, createdAt)
  ];
  if (activationBatch !== null && activationHash !== null) {
    crmProjections.push(activationProjection(execution, activationBatch, activationHash, createdAt));
  }

  return {
    assignment,
    activationBatch,
    evidence: {
      configurationHash,
      submissionHash,
      decisionRequestHash,
      assignmentHash,
      activationHash
    },
    crmProjections
  };
}
