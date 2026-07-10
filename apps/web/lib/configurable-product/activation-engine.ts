import type { JsonPrimitive } from "../hubspot/contracts.js";
import {
  type ActivationExecutionBatchPayload,
  type ActivationPredicate,
  type ArchetypeAssignmentPayload,
  type FormSubmissionPayload,
  type ProductConfigurationPayload
} from "./contracts.js";
import { ConfigurableProductError } from "./validation.js";

function primitiveEquals(left: JsonPrimitive, right: JsonPrimitive): boolean {
  return Object.is(left, right);
}

function matchesScalar(
  actual: JsonPrimitive,
  operator: "equals" | "in" | "number_gte" | "number_lte" | "answered",
  expected: JsonPrimitive | JsonPrimitive[]
): boolean {
  if (operator === "answered") return actual !== null;
  if (operator === "equals") {
    return !Array.isArray(expected) && primitiveEquals(actual, expected);
  }
  if (operator === "in") {
    return Array.isArray(expected) && expected.some((value) => primitiveEquals(actual, value));
  }
  if (typeof actual !== "number" || typeof expected !== "number") return false;
  return operator === "number_gte" ? actual >= expected : actual <= expected;
}

function predicateMatches(
  predicate: ActivationPredicate,
  assignment: ArchetypeAssignmentPayload,
  answers: Map<string, JsonPrimitive>,
  knownQuestionIds: Set<string>
): boolean {
  if (predicate.source === "assignment") {
    const actual = predicate.field === "archetypeVersionId"
      ? assignment.archetypeVersionId
      : assignment.confidence;
    return matchesScalar(actual, predicate.operator, predicate.value);
  }

  if (!knownQuestionIds.has(predicate.questionVersionId)) {
    throw new ConfigurableProductError(
      "ACTIVATION_RULE_INVALID",
      "Activation rule references an unknown question version.",
      { questionVersionId: predicate.questionVersionId }
    );
  }
  const actual = answers.get(predicate.questionVersionId) ?? null;
  return matchesScalar(actual, predicate.operator, predicate.value);
}

export function evaluateActivationRules(input: {
  batchId: string;
  configuration: ProductConfigurationPayload;
  submission: FormSubmissionPayload;
  assignment: ArchetypeAssignmentPayload;
  inputSnapshotHashes: string[];
  executedAt: string;
}): ActivationExecutionBatchPayload | null {
  const answers = new Map(
    input.submission.answers.map((answer) => [answer.questionVersionId, answer.value])
  );
  const knownQuestionIds = new Set(
    input.configuration.formVersion.questions.map((question) => question.id)
  );

  const rules = input.configuration.activationRuleVersions
    .filter((rule) => rule.status === "published")
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

  const executions = rules
    .filter((rule) => rule.all.every((predicate) =>
      predicateMatches(predicate, input.assignment, answers, knownQuestionIds)
    ))
    .map((rule) => ({
      executionId: `${input.batchId}:${rule.id}`,
      activationRuleVersionId: rule.id,
      assignmentId: input.assignment.assignmentId,
      inputSnapshotHashes: [...input.inputSnapshotHashes],
      action: structuredClone(rule.action),
      executedAt: input.executedAt,
      status: "planned" as const
    }));

  if (executions.length === 0) return null;
  return {
    batchId: input.batchId,
    assignmentId: input.assignment.assignmentId,
    executions,
    createdAt: input.executedAt
  };
}
