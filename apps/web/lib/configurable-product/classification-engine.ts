import type { JsonPrimitive } from "../hubspot/contracts.js";
import {
  type AnswerCondition,
  type ArchetypeAssignmentPayload,
  type ArchetypeScore,
  type AssignmentOverride,
  type AssignmentReason,
  type ClassificationDecision,
  type FormSubmissionPayload,
  type ProductConfigurationPayload
} from "./contracts.js";
import {
  ConfigurableProductError,
  assertPublishedConfiguration,
  assertValidSubmission,
  requirePublishedArchetype
} from "./validation.js";

function primitiveEquals(left: JsonPrimitive, right: JsonPrimitive): boolean {
  return Object.is(left, right);
}

function answerMap(submission: FormSubmissionPayload): Map<string, JsonPrimitive> {
  return new Map(
    submission.answers.map((answer) => [answer.questionVersionId, answer.value])
  );
}

function conditionMatches(
  condition: AnswerCondition,
  answers: Map<string, JsonPrimitive>
): boolean {
  const answer = answers.get(condition.questionVersionId);

  if (condition.operator === "answered") {
    return answer !== undefined && answer !== null;
  }
  if (answer === undefined || answer === null) return false;

  if (condition.operator === "equals") {
    return primitiveEquals(answer, condition.value);
  }
  if (condition.operator === "in") {
    return condition.values.some((value) => primitiveEquals(answer, value));
  }
  if (typeof answer !== "number") return false;
  if (condition.operator === "number_gte") return answer >= condition.value;
  return answer <= condition.value;
}

function stableScores(
  scoreMap: Map<string, number>,
  configuration: ProductConfigurationPayload
): ArchetypeScore[] {
  const priorityById = new Map(
    configuration.archetypeVersions.map((version) => [version.id, version.priority])
  );

  return [...scoreMap.entries()]
    .map(([archetypeVersionId, score]) => ({ archetypeVersionId, score }))
    .sort((left, right) =>
      right.score - left.score ||
      (priorityById.get(left.archetypeVersionId) ?? Number.MAX_SAFE_INTEGER) -
        (priorityById.get(right.archetypeVersionId) ?? Number.MAX_SAFE_INTEGER) ||
      left.archetypeVersionId.localeCompare(right.archetypeVersionId)
    );
}

export function classifySubmission(
  configuration: ProductConfigurationPayload,
  submission: FormSubmissionPayload
): ClassificationDecision {
  assertPublishedConfiguration(configuration);
  assertValidSubmission(configuration, submission);

  const policy = configuration.classificationPolicyVersion;
  const answers = answerMap(submission);
  const scoreMap = new Map(
    policy.eligibleArchetypeVersionIds.map((archetypeVersionId) => [archetypeVersionId, 0])
  );

  for (const rule of policy.rules) {
    if (!rule.all.every((condition) => conditionMatches(condition, answers))) continue;
    for (const effect of rule.scores) {
      scoreMap.set(
        effect.archetypeVersionId,
        (scoreMap.get(effect.archetypeVersionId) ?? 0) + effect.points
      );
    }
  }

  const scores = stableScores(scoreMap, configuration);
  const best = scores[0];
  if (!best || best.score < policy.minimumScore) {
    return {
      archetypeVersionId: null,
      confidence: null,
      scores,
      abstainedReason: "minimum_score"
    };
  }

  const contenders = scores.filter(
    (candidate) => best.score - candidate.score < policy.minimumMargin
  );
  if (contenders.length > 1 && policy.tieBreakStrategy === "abstain") {
    return {
      archetypeVersionId: null,
      confidence: null,
      scores,
      abstainedReason: "minimum_margin"
    };
  }

  const selected = contenders[0] ?? best;
  return {
    archetypeVersionId: selected.archetypeVersionId,
    confidence: null,
    scores,
    abstainedReason: null
  };
}

export type AssignmentCreationInput = {
  assignmentId: string;
  submissionObjectId: string;
  reason: AssignmentReason;
  supersedesAssignmentId: string | null;
  configuration: ProductConfigurationPayload;
  submission: FormSubmissionPayload;
  inputSnapshotHashes: string[];
  createdAt: string;
  override: AssignmentOverride | null;
};

function assertAssignmentTransition(input: AssignmentCreationInput): void {
  if (input.reason === "classified" && input.supersedesAssignmentId !== null) {
    throw new ConfigurableProductError(
      "ASSIGNMENT_HISTORY_INVALID",
      "An initial classification cannot supersede an existing assignment."
    );
  }
  if (input.reason !== "classified" && input.supersedesAssignmentId === null) {
    throw new ConfigurableProductError(
      "ASSIGNMENT_HISTORY_INVALID",
      "Recalculation and override must supersede an existing assignment."
    );
  }
  if (input.reason === "override") {
    if (!input.override || input.override.justification.trim().length === 0) {
      throw new ConfigurableProductError(
        "OVERRIDE_JUSTIFICATION_REQUIRED",
        "An override requires an actor and a non-empty justification."
      );
    }
    if (input.override.actorObjectId.trim().length === 0) {
      throw new ConfigurableProductError(
        "OVERRIDE_ACTOR_REQUIRED",
        "An override requires an actor object id."
      );
    }
  } else if (input.override !== null) {
    throw new ConfigurableProductError(
      "ASSIGNMENT_HISTORY_INVALID",
      "Only override assignments may contain override metadata."
    );
  }
}

export function createArchetypeAssignment(
  input: AssignmentCreationInput,
  overrideArchetypeVersionId: string | null = null
): ArchetypeAssignmentPayload {
  assertAssignmentTransition(input);
  const decision = classifySubmission(input.configuration, input.submission);

  let archetypeVersionId = decision.archetypeVersionId;
  let confidence = decision.confidence;
  if (input.reason === "override") {
    if (overrideArchetypeVersionId === null) {
      throw new ConfigurableProductError(
        "OVERRIDE_TARGET_REQUIRED",
        "An override requires a target archetype version."
      );
    }
    requirePublishedArchetype(input.configuration, overrideArchetypeVersionId);
    if (!input.configuration.classificationPolicyVersion.eligibleArchetypeVersionIds.includes(
      overrideArchetypeVersionId
    )) {
      throw new ConfigurableProductError(
        "OVERRIDE_TARGET_INELIGIBLE",
        "Override target is not eligible under the active policy.",
        { archetypeVersionId: overrideArchetypeVersionId }
      );
    }
    archetypeVersionId = overrideArchetypeVersionId;
    confidence = null;
  }

  return {
    assignmentId: input.assignmentId,
    submissionObjectId: input.submissionObjectId,
    formVersionId: input.configuration.formVersion.id,
    classificationPolicyVersionId: input.configuration.classificationPolicyVersion.id,
    archetypeVersionId,
    confidence,
    reason: input.reason,
    supersedesAssignmentId: input.supersedesAssignmentId,
    scores: decision.scores,
    inputSnapshotHashes: [...input.inputSnapshotHashes],
    createdAt: input.createdAt,
    override: input.override
  };
}
