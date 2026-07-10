import {
  type ArchetypeVersion,
  type FormSubmissionPayload,
  type ProductConfigurationPayload,
  type QuestionVersion
} from "./contracts.js";

export class ConfigurableProductError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ConfigurableProductError";
  }
}

function requireNonEmpty(value: string, code: string, field: string): void {
  if (value.trim().length === 0) {
    throw new ConfigurableProductError(code, `${field} must not be empty.`, { field });
  }
}

function assertUnique(values: string[], code: string, label: string): void {
  if (new Set(values).size !== values.length) {
    throw new ConfigurableProductError(code, `${label} must be unique.`, { label });
  }
}

function assertQuestion(question: QuestionVersion): void {
  requireNonEmpty(question.id, "CONFIGURATION_INVALID", "question.id");
  requireNonEmpty(question.code, "CONFIGURATION_INVALID", "question.code");
  requireNonEmpty(question.prompt, "CONFIGURATION_INVALID", "question.prompt");

  if (!Number.isInteger(question.position) || question.position < 0) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Question position must be a non-negative integer.",
      { questionVersionId: question.id }
    );
  }

  assertUnique(
    question.options.map((option) => option.id),
    "CONFIGURATION_INVALID",
    `option ids for ${question.id}`
  );
  assertUnique(
    question.options.map((option) => option.code),
    "CONFIGURATION_INVALID",
    `option codes for ${question.id}`
  );

  if (question.responseType === "single_select" && question.options.length === 0) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Single-select questions require at least one option.",
      { questionVersionId: question.id }
    );
  }

  if (question.responseType !== "single_select" && question.options.length > 0) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Only single-select questions may define options.",
      { questionVersionId: question.id }
    );
  }
}

export function assertPublishedConfiguration(
  configuration: ProductConfigurationPayload
): void {
  requireNonEmpty(configuration.configurationId, "CONFIGURATION_INVALID", "configurationId");

  const form = configuration.formVersion;
  if (form.status !== "published" || form.publishedAt === null) {
    throw new ConfigurableProductError(
      "FORM_VERSION_NOT_PUBLISHED",
      "Only a published form version may receive submissions.",
      { formVersionId: form.id, status: form.status }
    );
  }

  if (form.definitionId !== configuration.formDefinition.id) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Form version does not belong to the supplied form definition."
    );
  }

  assertUnique(form.questions.map((question) => question.id), "CONFIGURATION_INVALID", "question ids");
  assertUnique(form.questions.map((question) => question.code), "CONFIGURATION_INVALID", "question codes");
  form.questions.forEach(assertQuestion);

  const definitions = new Map(
    configuration.archetypeDefinitions.map((definition) => [definition.id, definition])
  );
  assertUnique(
    configuration.archetypeDefinitions.map((definition) => definition.id),
    "CONFIGURATION_INVALID",
    "archetype definition ids"
  );
  assertUnique(
    configuration.archetypeDefinitions.map((definition) => definition.key),
    "CONFIGURATION_INVALID",
    "archetype definition keys"
  );
  assertUnique(
    configuration.archetypeVersions.map((version) => version.id),
    "CONFIGURATION_INVALID",
    "archetype version ids"
  );
  assertUnique(
    configuration.archetypeVersions.map((version) => version.code),
    "CONFIGURATION_INVALID",
    "archetype version codes"
  );

  for (const version of configuration.archetypeVersions) {
    if (!definitions.has(version.definitionId)) {
      throw new ConfigurableProductError(
        "CONFIGURATION_INVALID",
        "Archetype version references an unknown definition.",
        { archetypeVersionId: version.id }
      );
    }
    if (!Number.isInteger(version.priority) || version.priority < 0) {
      throw new ConfigurableProductError(
        "CONFIGURATION_INVALID",
        "Archetype priority must be a non-negative integer.",
        { archetypeVersionId: version.id }
      );
    }
  }

  const policy = configuration.classificationPolicyVersion;
  if (policy.status !== "published") {
    throw new ConfigurableProductError(
      "CLASSIFICATION_POLICY_NOT_PUBLISHED",
      "Only a published classification policy may classify submissions.",
      { policyVersionId: policy.id, status: policy.status }
    );
  }
  if (policy.formVersionId !== form.id) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Classification policy and form version do not match."
    );
  }
  if (policy.eligibleArchetypeVersionIds.length === 0) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "A classification policy requires at least one eligible archetype."
    );
  }
  assertUnique(
    policy.eligibleArchetypeVersionIds,
    "CONFIGURATION_INVALID",
    "eligible archetype version ids"
  );
  assertUnique(policy.rules.map((rule) => rule.id), "CONFIGURATION_INVALID", "classification rule ids");

  const questionIds = new Set(form.questions.map((question) => question.id));
  const archetypeVersions = new Map(
    configuration.archetypeVersions.map((version) => [version.id, version])
  );

  for (const archetypeVersionId of policy.eligibleArchetypeVersionIds) {
    const version = archetypeVersions.get(archetypeVersionId);
    if (!version || version.status !== "published") {
      throw new ConfigurableProductError(
        "ARCHETYPE_NOT_ELIGIBLE",
        "Eligible archetypes must exist and be published.",
        { archetypeVersionId }
      );
    }
  }

  for (const rule of policy.rules) {
    if (rule.scores.length === 0) {
      throw new ConfigurableProductError(
        "CONFIGURATION_INVALID",
        "Classification rules require at least one score effect.",
        { ruleId: rule.id }
      );
    }
    for (const condition of rule.all) {
      if (!questionIds.has(condition.questionVersionId)) {
        throw new ConfigurableProductError(
          "CONFIGURATION_INVALID",
          "Classification rule references an unknown question version.",
          { ruleId: rule.id, questionVersionId: condition.questionVersionId }
        );
      }
    }
    for (const score of rule.scores) {
      if (!policy.eligibleArchetypeVersionIds.includes(score.archetypeVersionId)) {
        throw new ConfigurableProductError(
          "CONFIGURATION_INVALID",
          "Classification rule scores an ineligible archetype.",
          { ruleId: rule.id, archetypeVersionId: score.archetypeVersionId }
        );
      }
      if (!Number.isFinite(score.points)) {
        throw new ConfigurableProductError(
          "CONFIGURATION_INVALID",
          "Classification score points must be finite.",
          { ruleId: rule.id }
        );
      }
    }
  }

  if (!Number.isFinite(policy.minimumScore) || !Number.isFinite(policy.minimumMargin) || policy.minimumMargin < 0) {
    throw new ConfigurableProductError(
      "CONFIGURATION_INVALID",
      "Classification thresholds must be finite and minimumMargin cannot be negative."
    );
  }

  assertUnique(
    configuration.activationRuleVersions.map((rule) => rule.id),
    "CONFIGURATION_INVALID",
    "activation rule version ids"
  );
}

function assertAnswerType(question: QuestionVersion, value: unknown): void {
  if (question.responseType === "single_select") {
    if (typeof value !== "string" || !question.options.some((option) => option.code === value)) {
      throw new ConfigurableProductError(
        "ANSWER_INVALID",
        "Answer is not a valid option for the question.",
        { questionVersionId: question.id }
      );
    }
    return;
  }
  if (question.responseType === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new ConfigurableProductError("ANSWER_INVALID", "Answer must be a finite number.", {
      questionVersionId: question.id
    });
  }
  if (question.responseType === "boolean" && typeof value !== "boolean") {
    throw new ConfigurableProductError("ANSWER_INVALID", "Answer must be boolean.", {
      questionVersionId: question.id
    });
  }
  if (question.responseType === "text" && (typeof value !== "string" || value.trim().length === 0)) {
    throw new ConfigurableProductError("ANSWER_INVALID", "Answer must be non-empty text.", {
      questionVersionId: question.id
    });
  }
}

export function assertValidSubmission(
  configuration: ProductConfigurationPayload,
  submission: FormSubmissionPayload
): void {
  if (submission.formVersionId !== configuration.formVersion.id) {
    throw new ConfigurableProductError(
      "SUBMISSION_FORM_VERSION_MISMATCH",
      "Submission does not target the active form version."
    );
  }

  const answers = new Map<string, unknown>();
  for (const answer of submission.answers) {
    if (answers.has(answer.questionVersionId)) {
      throw new ConfigurableProductError(
        "ANSWER_DUPLICATED",
        "A question may only be answered once per submission.",
        { questionVersionId: answer.questionVersionId }
      );
    }
    answers.set(answer.questionVersionId, answer.value);
  }

  const questions = new Map(
    configuration.formVersion.questions.map((question) => [question.id, question])
  );
  for (const questionVersionId of answers.keys()) {
    if (!questions.has(questionVersionId)) {
      throw new ConfigurableProductError(
        "ANSWER_UNKNOWN_QUESTION",
        "Submission contains an answer for an unknown question version.",
        { questionVersionId }
      );
    }
  }

  for (const question of configuration.formVersion.questions) {
    const value = answers.get(question.id);
    if (value === undefined || value === null) {
      if (question.required) {
        throw new ConfigurableProductError(
          "REQUIRED_ANSWER_MISSING",
          "Submission is missing a required answer.",
          { questionVersionId: question.id }
        );
      }
      continue;
    }
    assertAnswerType(question, value);
  }
}

export function requirePublishedArchetype(
  configuration: ProductConfigurationPayload,
  archetypeVersionId: string
): ArchetypeVersion {
  const archetype = configuration.archetypeVersions.find(
    (candidate) => candidate.id === archetypeVersionId
  );
  if (!archetype || archetype.status !== "published") {
    throw new ConfigurableProductError(
      "ARCHETYPE_NOT_PUBLISHED",
      "The requested archetype version is not published.",
      { archetypeVersionId }
    );
  }
  return archetype;
}
