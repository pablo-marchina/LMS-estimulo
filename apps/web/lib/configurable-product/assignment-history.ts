import type { ArchetypeAssignmentPayload } from "./contracts.js";
import { ConfigurableProductError } from "./validation.js";

export function appendAssignmentHistory(
  history: readonly ArchetypeAssignmentPayload[],
  next: ArchetypeAssignmentPayload
): ArchetypeAssignmentPayload[] {
  if (history.some((assignment) => assignment.assignmentId === next.assignmentId)) {
    throw new ConfigurableProductError(
      "ASSIGNMENT_ALREADY_EXISTS",
      "Assignment history is append-only and assignment ids cannot be reused.",
      { assignmentId: next.assignmentId }
    );
  }

  if (next.supersedesAssignmentId !== null) {
    const previous = history.find(
      (assignment) => assignment.assignmentId === next.supersedesAssignmentId
    );
    if (!previous) {
      throw new ConfigurableProductError(
        "SUPERSEDED_ASSIGNMENT_NOT_FOUND",
        "The assignment being superseded does not exist.",
        { assignmentId: next.supersedesAssignmentId }
      );
    }
    if (previous.submissionObjectId !== next.submissionObjectId) {
      throw new ConfigurableProductError(
        "ASSIGNMENT_HISTORY_INVALID",
        "An assignment can only supersede a result for the same submission object."
      );
    }
    const alreadySuperseded = history.some(
      (assignment) => assignment.supersedesAssignmentId === previous.assignmentId
    );
    if (alreadySuperseded) {
      throw new ConfigurableProductError(
        "ASSIGNMENT_ALREADY_SUPERSEDED",
        "An assignment cannot be superseded by multiple active successors.",
        { assignmentId: previous.assignmentId }
      );
    }
  }

  return [...history.map((assignment) => structuredClone(assignment)), structuredClone(next)];
}

export function currentAssignment(
  history: readonly ArchetypeAssignmentPayload[]
): ArchetypeAssignmentPayload | null {
  const superseded = new Set(
    history
      .map((assignment) => assignment.supersedesAssignmentId)
      .filter((assignmentId): assignmentId is string => assignmentId !== null)
  );
  const current = history.filter(
    (assignment) => !superseded.has(assignment.assignmentId)
  );

  if (current.length === 0) return null;
  if (current.length > 1) {
    throw new ConfigurableProductError(
      "ASSIGNMENT_HISTORY_FORKED",
      "Assignment history contains more than one active result."
    );
  }
  return structuredClone(current[0]);
}
