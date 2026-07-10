import type {
  HubSpotSource,
  JsonObject,
  JsonPrimitive
} from "../hubspot/contracts.js";

export type VersionStatus = "draft" | "published" | "retired";
export type AssignmentReason = "classified" | "recalculated" | "override";
export type TieBreakStrategy = "abstain" | "priority";

export type FormDefinition = {
  id: string;
  key: string;
  displayName: string;
};

export type QuestionOptionVersion = {
  id: string;
  code: string;
  label: string;
  position: number;
};

export type QuestionVersion = {
  id: string;
  questionDefinitionId: string;
  code: string;
  prompt: string;
  responseType: "single_select" | "number" | "boolean" | "text";
  required: boolean;
  position: number;
  options: QuestionOptionVersion[];
};

export type FormVersion = {
  id: string;
  definitionId: string;
  versionNumber: number;
  status: VersionStatus;
  publishedAt: string | null;
  questions: QuestionVersion[];
};

export type ArchetypeDefinition = {
  id: string;
  key: string;
};

export type ArchetypeVersion = {
  id: string;
  definitionId: string;
  versionNumber: number;
  status: VersionStatus;
  code: string;
  name: string;
  description: string;
  priority: number;
};

export type AnswerCondition =
  | {
      operator: "equals";
      questionVersionId: string;
      value: JsonPrimitive;
    }
  | {
      operator: "in";
      questionVersionId: string;
      values: JsonPrimitive[];
    }
  | {
      operator: "number_gte" | "number_lte";
      questionVersionId: string;
      value: number;
    }
  | {
      operator: "answered";
      questionVersionId: string;
    };

export type ClassificationRule = {
  id: string;
  all: AnswerCondition[];
  scores: Array<{
    archetypeVersionId: string;
    points: number;
  }>;
};

export type ClassificationPolicyVersion = {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  formVersionId: string;
  eligibleArchetypeVersionIds: string[];
  rules: ClassificationRule[];
  minimumScore: number;
  minimumMargin: number;
  tieBreakStrategy: TieBreakStrategy;
};

export type ActivationPredicate =
  | {
      source: "assignment";
      field: "archetypeVersionId";
      operator: "equals" | "in";
      value: JsonPrimitive | JsonPrimitive[];
    }
  | {
      source: "assignment";
      field: "confidence";
      operator: "number_gte" | "number_lte";
      value: number;
    }
  | {
      source: "submission_answer";
      questionVersionId: string;
      operator: "equals" | "in" | "number_gte" | "number_lte" | "answered";
      value: JsonPrimitive | JsonPrimitive[];
    };

export type ActivationAction = {
  type:
    | "assign_journey"
    | "recommend_content"
    | "create_task"
    | "set_segment"
    | "emit_event";
  parameters: JsonObject;
};

export type ActivationRuleVersion = {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  priority: number;
  all: ActivationPredicate[];
  action: ActivationAction;
};

export type ProductConfigurationPayload = {
  configurationId: string;
  formDefinition: FormDefinition;
  formVersion: FormVersion;
  archetypeDefinitions: ArchetypeDefinition[];
  archetypeVersions: ArchetypeVersion[];
  classificationPolicyVersion: ClassificationPolicyVersion;
  activationRuleVersions: ActivationRuleVersion[];
};

export type FormAnswer = {
  questionVersionId: string;
  value: JsonPrimitive;
};

export type FormSubmissionPayload = {
  submissionId: string;
  participantObjectId: string;
  formVersionId: string;
  answers: FormAnswer[];
  submittedAt: string;
};

export type ArchetypeScore = {
  archetypeVersionId: string;
  score: number;
};

export type AssignmentOverride = {
  actorObjectId: string;
  justification: string;
};

export type DecisionRequestPayload = {
  requestId: string;
  reason: AssignmentReason;
  supersedesAssignmentId: string | null;
  override: AssignmentOverride | null;
  overrideArchetypeVersionId: string | null;
  requestedAt: string;
};

export type ArchetypeAssignmentPayload = {
  assignmentId: string;
  submissionObjectId: string;
  formVersionId: string;
  classificationPolicyVersionId: string;
  archetypeVersionId: string | null;
  confidence: number | null;
  reason: AssignmentReason;
  supersedesAssignmentId: string | null;
  scores: ArchetypeScore[];
  inputSnapshotHashes: string[];
  createdAt: string;
  override: AssignmentOverride | null;
};

export type ActivationExecution = {
  executionId: string;
  activationRuleVersionId: string;
  assignmentId: string;
  inputSnapshotHashes: string[];
  action: ActivationAction;
  executedAt: string;
  status: "planned";
};

export type ActivationExecutionBatchPayload = {
  batchId: string;
  assignmentId: string;
  executions: ActivationExecution[];
  createdAt: string;
};

export type ClassificationDecision = {
  archetypeVersionId: string | null;
  confidence: number | null;
  scores: ArchetypeScore[];
  abstainedReason: "minimum_score" | "minimum_margin" | null;
};

export type ConfigurableProductEvidence = {
  configurationSource: HubSpotSource;
  submissionSource: HubSpotSource;
  decisionRequestSource: HubSpotSource;
  assignmentSource: HubSpotSource;
  activationSource: HubSpotSource | null;
};

export type HubSpotWriteTarget = {
  objectType: string;
  objectId: string;
  idempotencyKey: string;
  expectedVersion: string;
};

export type ConfigurableProductResult = {
  assignment: ArchetypeAssignmentPayload;
  activationBatch: ActivationExecutionBatchPayload | null;
  evidence: ConfigurableProductEvidence;
};
