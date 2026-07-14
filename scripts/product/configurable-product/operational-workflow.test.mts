import test from "node:test";
import assert from "node:assert/strict";
import type {
  FormSubmissionPayload,
  ProductConfigurationPayload
} from "../../../apps/web/lib/configurable-product/contracts.js";
import {
  executeOperationalConfigurableProductFlow
} from "../../../apps/web/lib/configurable-product/operational-workflow.js";
import { ConfigurableProductError } from "../../../apps/web/lib/configurable-product/validation.js";

const fixedNow = new Date("2026-07-14T16:00:00.000Z");

function configuration(): ProductConfigurationPayload {
  return {
    configurationId: "official-configuration-v1",
    formDefinition: {
      id: "form-definition-1",
      key: "entrepreneur-profile",
      displayName: "Entrepreneur profile"
    },
    formVersion: {
      id: "form-version-1",
      definitionId: "form-definition-1",
      versionNumber: 1,
      status: "published",
      publishedAt: "2026-07-14T15:00:00.000Z",
      questions: [
        {
          id: "question-version-1",
          questionDefinitionId: "question-definition-1",
          code: "working_style",
          prompt: "How do you prefer to start?",
          responseType: "single_select",
          required: true,
          position: 1,
          options: [
            { id: "option-a", code: "a", label: "Execute", position: 1 },
            { id: "option-b", code: "b", label: "Plan", position: 2 }
          ]
        }
      ]
    },
    archetypeDefinitions: [
      { id: "archetype-definition-a", key: "fazedor" },
      { id: "archetype-definition-b", key: "batalhador" },
      { id: "archetype-definition-c", key: "construtor" },
      { id: "archetype-definition-d", key: "navegador" }
    ],
    archetypeVersions: [
      {
        id: "archetype-a-v1",
        definitionId: "archetype-definition-a",
        versionNumber: 1,
        status: "published",
        code: "fazedor-v1",
        name: "Fazedor",
        description: "Parte rapidamente para a execução.",
        priority: 1
      },
      {
        id: "archetype-b-v1",
        definitionId: "archetype-definition-b",
        versionNumber: 1,
        status: "published",
        code: "batalhador-v1",
        name: "Batalhador",
        description: "Avança com persistência diante das restrições.",
        priority: 2
      },
      {
        id: "archetype-c-v1",
        definitionId: "archetype-definition-c",
        versionNumber: 1,
        status: "published",
        code: "construtor-v1",
        name: "Construtor",
        description: "Estrutura o negócio de forma progressiva.",
        priority: 3
      },
      {
        id: "archetype-d-v1",
        definitionId: "archetype-definition-d",
        versionNumber: 1,
        status: "published",
        code: "navegador-v1",
        name: "Navegador",
        description: "Explora caminhos antes de decidir.",
        priority: 4
      }
    ],
    classificationPolicyVersion: {
      id: "classification-policy-v1",
      versionNumber: 1,
      status: "published",
      formVersionId: "form-version-1",
      eligibleArchetypeVersionIds: [
        "archetype-a-v1",
        "archetype-b-v1",
        "archetype-c-v1",
        "archetype-d-v1"
      ],
      rules: [
        {
          id: "rule-execute",
          all: [
            {
              operator: "equals",
              questionVersionId: "question-version-1",
              value: "a"
            }
          ],
          scores: [{ archetypeVersionId: "archetype-a-v1", points: 10 }]
        },
        {
          id: "rule-plan",
          all: [
            {
              operator: "equals",
              questionVersionId: "question-version-1",
              value: "b"
            }
          ],
          scores: [{ archetypeVersionId: "archetype-c-v1", points: 10 }]
        }
      ],
      minimumScore: 5,
      minimumMargin: 1,
      tieBreakStrategy: "abstain"
    },
    activationRuleVersions: [
      {
        id: "activation-fazedor-v1",
        versionNumber: 1,
        status: "published",
        priority: 1,
        all: [
          {
            source: "assignment",
            field: "archetypeVersionId",
            operator: "equals",
            value: "archetype-a-v1"
          }
        ],
        action: {
          type: "recommend_content",
          parameters: { contentKey: "openai-first-practice" }
        }
      }
    ]
  };
}

function submission(answer: "a" | "b"): FormSubmissionPayload {
  return {
    submissionId: `submission-${answer}`,
    participantObjectId: "participant-1",
    formVersionId: "form-version-1",
    answers: [{ questionVersionId: "question-version-1", value: answer }],
    submittedAt: fixedNow.toISOString()
  };
}

function execute(answer: "a" | "b") {
  return executeOperationalConfigurableProductFlow({
    configuration: configuration(),
    submission: submission(answer),
    assignmentId: `assignment-${answer}`,
    activationBatchId: `activation-${answer}`,
    reason: "classified",
    supersedesAssignmentId: null,
    override: null,
    overrideArchetypeVersionId: null,
    now: () => new Date(fixedNow)
  });
}

test("classifies and creates CRM projection commands without a HubSpot gateway", () => {
  const result = execute("a");

  assert.equal(result.assignment.archetypeVersionId, "archetype-a-v1");
  assert.equal(result.activationBatch?.executions.length, 1);
  assert.deepEqual(
    result.crmProjections.map((projection) => projection.projectionType),
    [
      "diagnostic_submission_summary",
      "archetype_assignment_summary",
      "activation_summary"
    ]
  );
  assert.ok(result.evidence.configurationHash.length > 0);
  assert.ok(result.evidence.assignmentHash.length > 0);
  assert.equal(result.crmProjections.every((projection) => !projection.requiresReadback), true);
});

test("produces deterministic evidence and idempotency keys for the same inputs", () => {
  const first = execute("a");
  const second = execute("a");

  assert.deepEqual(first.evidence, second.evidence);
  assert.deepEqual(
    first.crmProjections.map((projection) => projection.idempotencyKey),
    second.crmProjections.map((projection) => projection.idempotencyKey)
  );
});

test("keeps CRM projection asynchronous when no activation rule matches", () => {
  const result = execute("b");

  assert.equal(result.assignment.archetypeVersionId, "archetype-c-v1");
  assert.equal(result.activationBatch, null);
  assert.deepEqual(
    result.crmProjections.map((projection) => projection.projectionType),
    ["diagnostic_submission_summary", "archetype_assignment_summary"]
  );
});

test("preserves override validation in the operational flow", () => {
  assert.throws(
    () => executeOperationalConfigurableProductFlow({
      configuration: configuration(),
      submission: submission("a"),
      assignmentId: "assignment-override",
      activationBatchId: "activation-override",
      reason: "override",
      supersedesAssignmentId: "assignment-a",
      override: { actorObjectId: "operator-1", justification: "" },
      overrideArchetypeVersionId: "archetype-c-v1",
      now: () => new Date(fixedNow)
    }),
    (error: unknown) =>
      error instanceof ConfigurableProductError &&
      error.code === "OVERRIDE_JUSTIFICATION_REQUIRED"
  );
});
