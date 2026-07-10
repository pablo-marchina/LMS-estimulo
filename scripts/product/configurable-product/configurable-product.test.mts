import test from "node:test";
import assert from "node:assert/strict";
import type {
  HubSpotSnapshotQuery,
  HubSpotWriteCommand
} from "../../../apps/web/lib/hubspot/contracts.js";
import { InMemoryHubSpotAdapter } from "../../../apps/web/lib/hubspot/in-memory-adapter.js";
import {
  appendAssignmentHistory,
  currentAssignment
} from "../../../apps/web/lib/configurable-product/assignment-history.js";
import {
  type FormSubmissionPayload,
  type ProductConfigurationPayload
} from "../../../apps/web/lib/configurable-product/contracts.js";
import { ConfigurableProductError } from "../../../apps/web/lib/configurable-product/validation.js";
import {
  executeConfigurableProductFlow,
  type ConfigurableProductExecution,
  type SubmissionInput
} from "../../../apps/web/lib/configurable-product/workflow.js";

const fixedNow = new Date("2026-07-10T10:00:00.000Z");
const noWait = async (): Promise<void> => undefined;

function baseConfiguration(): ProductConfigurationPayload {
  return {
    configurationId: "configuration-v1",
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
      publishedAt: "2026-07-10T09:00:00.000Z",
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
            { id: "option-a", code: "a", label: "Build", position: 1 },
            { id: "option-b", code: "b", label: "Plan", position: 2 }
          ]
        },
        {
          id: "question-version-2",
          questionDefinitionId: "question-definition-2",
          code: "team_size",
          prompt: "How many people are in the team?",
          responseType: "number",
          required: false,
          position: 2,
          options: []
        }
      ]
    },
    archetypeDefinitions: [
      { id: "archetype-definition-a", key: "builder" },
      { id: "archetype-definition-b", key: "planner" },
      { id: "archetype-definition-c", key: "connector" },
      { id: "archetype-definition-d", key: "explorer" }
    ],
    archetypeVersions: [
      {
        id: "archetype-a-v1",
        definitionId: "archetype-definition-a",
        versionNumber: 1,
        status: "published",
        code: "builder-v1",
        name: "Builder",
        description: "Starts through execution.",
        priority: 1
      },
      {
        id: "archetype-b-v1",
        definitionId: "archetype-definition-b",
        versionNumber: 1,
        status: "published",
        code: "planner-v1",
        name: "Planner",
        description: "Starts through planning.",
        priority: 2
      },
      {
        id: "archetype-c-v1",
        definitionId: "archetype-definition-c",
        versionNumber: 1,
        status: "published",
        code: "connector-v1",
        name: "Connector",
        description: "Mobilizes a larger team.",
        priority: 3
      },
      {
        id: "archetype-d-v1",
        definitionId: "archetype-definition-d",
        versionNumber: 1,
        status: "published",
        code: "explorer-v1",
        name: "Explorer",
        description: "Needs more evidence before classification.",
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
          id: "rule-working-style-a",
          all: [
            { operator: "equals", questionVersionId: "question-version-1", value: "a" }
          ],
          scores: [
            { archetypeVersionId: "archetype-a-v1", points: 10 },
            { archetypeVersionId: "archetype-b-v1", points: 2 }
          ]
        },
        {
          id: "rule-working-style-b",
          all: [
            { operator: "equals", questionVersionId: "question-version-1", value: "b" }
          ],
          scores: [{ archetypeVersionId: "archetype-b-v1", points: 10 }]
        },
        {
          id: "rule-larger-team",
          all: [
            { operator: "number_gte", questionVersionId: "question-version-2", value: 5 }
          ],
          scores: [{ archetypeVersionId: "archetype-c-v1", points: 8 }]
        }
      ],
      minimumScore: 5,
      minimumMargin: 1,
      tieBreakStrategy: "abstain"
    },
    activationRuleVersions: [
      {
        id: "activation-builder-content-v1",
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
          parameters: { contentKey: "builder-start" }
        }
      },
      {
        id: "activation-larger-team-task-v1",
        versionNumber: 1,
        status: "published",
        priority: 2,
        all: [
          {
            source: "submission_answer",
            questionVersionId: "question-version-2",
            operator: "number_gte",
            value: 5
          }
        ],
        action: {
          type: "create_task",
          parameters: { taskKey: "team-support" }
        }
      },
      {
        id: "activation-draft-v1",
        versionNumber: 1,
        status: "draft",
        priority: 0,
        all: [],
        action: {
          type: "emit_event",
          parameters: { eventName: "must-not-run" }
        }
      }
    ]
  };
}

function baseSubmission(): FormSubmissionPayload {
  return {
    submissionId: "submission-1",
    participantObjectId: "contact-1",
    formVersionId: "form-version-1",
    answers: [
      { questionVersionId: "question-version-1", value: "a" },
      { questionVersionId: "question-version-2", value: 7 }
    ],
    submittedAt: fixedNow.toISOString()
  };
}

async function seedConfiguration(
  adapter: InMemoryHubSpotAdapter,
  configuration: ProductConfigurationPayload,
  objectId: string
): Promise<HubSpotSnapshotQuery> {
  const receipt = await adapter.write({
    idempotencyKey: `seed-${objectId}`,
    kind: "configuration",
    objectType: "logical_product_configuration",
    objectId,
    expectedVersion: "0",
    payload: configuration
  });
  await adapter.readBack(receipt);
  return { objectType: receipt.objectType, objectId: receipt.objectId };
}

function submissionWrite(
  submission: FormSubmissionPayload,
  suffix: string
): HubSpotWriteCommand<FormSubmissionPayload> {
  return {
    idempotencyKey: `submission-${suffix}`,
    kind: "collected_data",
    objectType: "logical_form_submission",
    objectId: submission.submissionId,
    expectedVersion: "0",
    payload: submission
  };
}

function execution(input: {
  adapter: InMemoryHubSpotAdapter;
  configurationQuery: HubSpotSnapshotQuery;
  suffix: string;
  submissionInput?: SubmissionInput;
  reason?: "classified" | "recalculated" | "override";
  supersedesAssignmentId?: string | null;
  override?: { actorObjectId: string; justification: string } | null;
  overrideArchetypeVersionId?: string | null;
  activationTarget?: boolean;
}): ConfigurableProductExecution {
  const suffix = input.suffix;
  return {
    gateway: input.adapter,
    configurationQuery: input.configurationQuery,
    submissionInput: input.submissionInput ?? {
      mode: "write",
      command: submissionWrite(baseSubmission(), suffix)
    },
    assignmentTarget: {
      objectType: "logical_archetype_assignment",
      objectId: `assignment-${suffix}`,
      idempotencyKey: `assignment-write-${suffix}`,
      expectedVersion: "0"
    },
    activationTarget: input.activationTarget === false ? null : {
      objectType: "logical_activation_batch",
      objectId: `activation-${suffix}`,
      idempotencyKey: `activation-write-${suffix}`,
      expectedVersion: "0"
    },
    assignmentId: `assignment-${suffix}`,
    activationBatchId: `activation-${suffix}`,
    reason: input.reason ?? "classified",
    supersedesAssignmentId: input.supersedesAssignmentId ?? null,
    override: input.override ?? null,
    overrideArchetypeVersionId: input.overrideArchetypeVersionId ?? null,
    now: () => new Date(fixedNow),
    retry: { maxAttempts: 4, delayMs: 0, sleep: noWait }
  };
}

test("classifies and activates only after HubSpot readbacks", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configurationQuery = await seedConfiguration(
    adapter,
    baseConfiguration(),
    "configuration-v1"
  );

  const result = await executeConfigurableProductFlow(
    execution({ adapter, configurationQuery, suffix: "initial" })
  );

  assert.equal(result.assignment.archetypeVersionId, "archetype-a-v1");
  assert.equal(result.assignment.reason, "classified");
  assert.equal(result.assignment.confidence, null);
  assert.deepEqual(
    result.activationBatch?.executions.map((item) => item.activationRuleVersionId),
    ["activation-builder-content-v1", "activation-larger-team-task-v1"]
  );
  assert.equal(result.assignment.inputSnapshotHashes.length, 2);
  assert.equal(result.evidence.configurationSource.objectType, "logical_product_configuration");
  assert.equal(result.evidence.submissionSource.objectType, "logical_form_submission");
  assert.equal(result.evidence.assignmentSource.objectType, "logical_archetype_assignment");
  assert.equal(result.evidence.activationSource?.objectType, "logical_activation_batch");
});

test("supports adding a fifth archetype without code changes", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configuration = structuredClone(baseConfiguration());
  configuration.configurationId = "configuration-v2-five-archetypes";
  configuration.archetypeDefinitions.push({
    id: "archetype-definition-e",
    key: "accelerator"
  });
  configuration.archetypeVersions.push({
    id: "archetype-e-v1",
    definitionId: "archetype-definition-e",
    versionNumber: 1,
    status: "published",
    code: "accelerator-v1",
    name: "Accelerator",
    description: "Moves quickly with a clear direction.",
    priority: 0
  });
  configuration.classificationPolicyVersion.id = "classification-policy-v2";
  configuration.classificationPolicyVersion.versionNumber = 2;
  configuration.classificationPolicyVersion.eligibleArchetypeVersionIds.push("archetype-e-v1");
  configuration.classificationPolicyVersion.rules.push({
    id: "rule-accelerator",
    all: [
      { operator: "equals", questionVersionId: "question-version-1", value: "a" }
    ],
    scores: [{ archetypeVersionId: "archetype-e-v1", points: 20 }]
  });

  const configurationQuery = await seedConfiguration(
    adapter,
    configuration,
    "configuration-v2-five-archetypes"
  );
  const result = await executeConfigurableProductFlow(
    execution({ adapter, configurationQuery, suffix: "five" })
  );

  assert.equal(configuration.archetypeVersions.length, 5);
  assert.equal(result.assignment.archetypeVersionId, "archetype-e-v1");
  assert.equal(result.assignment.classificationPolicyVersionId, "classification-policy-v2");
});

test("retires an archetype for future classifications and preserves prior history", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const initialConfigurationQuery = await seedConfiguration(
    adapter,
    baseConfiguration(),
    "configuration-retirement-v1"
  );
  const first = await executeConfigurableProductFlow(
    execution({ adapter, configurationQuery: initialConfigurationQuery, suffix: "retirement-v1" })
  );
  let history = appendAssignmentHistory([], first.assignment);

  const nextConfiguration = structuredClone(baseConfiguration());
  nextConfiguration.configurationId = "configuration-retirement-v2";
  nextConfiguration.classificationPolicyVersion.id = "classification-policy-retirement-v2";
  nextConfiguration.classificationPolicyVersion.versionNumber = 2;
  const retired = nextConfiguration.archetypeVersions.find(
    (version) => version.id === "archetype-a-v1"
  );
  assert.ok(retired);
  retired.status = "retired";
  nextConfiguration.classificationPolicyVersion.eligibleArchetypeVersionIds =
    nextConfiguration.classificationPolicyVersion.eligibleArchetypeVersionIds.filter(
      (id) => id !== "archetype-a-v1"
    );
  for (const rule of nextConfiguration.classificationPolicyVersion.rules) {
    rule.scores = rule.scores.filter((score) => score.archetypeVersionId !== "archetype-a-v1");
  }
  const styleRule = nextConfiguration.classificationPolicyVersion.rules.find(
    (rule) => rule.id === "rule-working-style-a"
  );
  assert.ok(styleRule);
  styleRule.scores = [{ archetypeVersionId: "archetype-b-v1", points: 12 }];

  const nextConfigurationQuery = await seedConfiguration(
    adapter,
    nextConfiguration,
    "configuration-retirement-v2"
  );
  const second = await executeConfigurableProductFlow(
    execution({
      adapter,
      configurationQuery: nextConfigurationQuery,
      suffix: "retirement-v2",
      reason: "recalculated",
      supersedesAssignmentId: first.assignment.assignmentId,
      submissionInput: {
        mode: "read",
        query: {
          objectType: "logical_form_submission",
          objectId: "submission-1"
        }
      }
    })
  );
  history = appendAssignmentHistory(history, second.assignment);

  assert.equal(first.assignment.archetypeVersionId, "archetype-a-v1");
  assert.equal(second.assignment.archetypeVersionId, "archetype-b-v1");
  assert.equal(second.assignment.supersedesAssignmentId, first.assignment.assignmentId);
  assert.equal(currentAssignment(history)?.assignmentId, second.assignment.assignmentId);
  const preserved = await adapter.read({
    objectType: "logical_archetype_assignment",
    objectId: "assignment-retirement-v1"
  });
  assert.equal(preserved.payload.archetypeVersionId, "archetype-a-v1");
});

test("rejects draft policy versions before producing an assignment", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configuration = baseConfiguration();
  configuration.classificationPolicyVersion.status = "draft";
  const configurationQuery = await seedConfiguration(
    adapter,
    configuration,
    "configuration-draft-policy"
  );

  await assert.rejects(
    () => executeConfigurableProductFlow(
      execution({ adapter, configurationQuery, suffix: "draft-policy" })
    ),
    (error: unknown) =>
      error instanceof ConfigurableProductError &&
      error.code === "CLASSIFICATION_POLICY_NOT_PUBLISHED"
  );
  await assert.rejects(
    () => adapter.read({
      objectType: "logical_archetype_assignment",
      objectId: "assignment-draft-policy"
    })
  );
});

test("rejects submissions missing required answers", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configurationQuery = await seedConfiguration(
    adapter,
    baseConfiguration(),
    "configuration-required-answer"
  );
  const invalidSubmission = baseSubmission();
  invalidSubmission.answers = [
    { questionVersionId: "question-version-2", value: 7 }
  ];

  await assert.rejects(
    () => executeConfigurableProductFlow(
      execution({
        adapter,
        configurationQuery,
        suffix: "required-answer",
        submissionInput: {
          mode: "write",
          command: submissionWrite(invalidSubmission, "required-answer")
        }
      })
    ),
    (error: unknown) =>
      error instanceof ConfigurableProductError &&
      error.code === "REQUIRED_ANSWER_MISSING"
  );
});

test("abstains when the active policy cannot separate the top scores", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configuration = baseConfiguration();
  configuration.configurationId = "configuration-tie";
  configuration.classificationPolicyVersion.id = "classification-policy-tie";
  configuration.classificationPolicyVersion.rules = [
    {
      id: "rule-tie",
      all: [
        { operator: "equals", questionVersionId: "question-version-1", value: "a" }
      ],
      scores: [
        { archetypeVersionId: "archetype-a-v1", points: 10 },
        { archetypeVersionId: "archetype-b-v1", points: 10 }
      ]
    }
  ];
  const configurationQuery = await seedConfiguration(adapter, configuration, "configuration-tie");
  const submission = baseSubmission();
  submission.answers = [{ questionVersionId: "question-version-1", value: "a" }];

  const result = await executeConfigurableProductFlow(
    execution({
      adapter,
      configurationQuery,
      suffix: "tie",
      submissionInput: {
        mode: "write",
        command: submissionWrite(submission, "tie")
      }
    })
  );

  assert.equal(result.assignment.archetypeVersionId, null);
  assert.equal(result.assignment.confidence, null);
  assert.equal(result.activationBatch, null);
});

test("creates an append-only override with actor and justification", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configurationQuery = await seedConfiguration(
    adapter,
    baseConfiguration(),
    "configuration-override"
  );
  const first = await executeConfigurableProductFlow(
    execution({ adapter, configurationQuery, suffix: "override-v1" })
  );

  await assert.rejects(
    () => executeConfigurableProductFlow(
      execution({
        adapter,
        configurationQuery,
        suffix: "override-invalid",
        reason: "override",
        supersedesAssignmentId: first.assignment.assignmentId,
        override: { actorObjectId: "operator-1", justification: "" },
        overrideArchetypeVersionId: "archetype-b-v1",
        submissionInput: {
          mode: "read",
          query: { objectType: "logical_form_submission", objectId: "submission-1" }
        }
      })
    ),
    (error: unknown) =>
      error instanceof ConfigurableProductError &&
      error.code === "OVERRIDE_JUSTIFICATION_REQUIRED"
  );

  const overridden = await executeConfigurableProductFlow(
    execution({
      adapter,
      configurationQuery,
      suffix: "override-v2",
      reason: "override",
      supersedesAssignmentId: first.assignment.assignmentId,
      override: {
        actorObjectId: "operator-1",
        justification: "Participant context was reviewed by the authorized operator."
      },
      overrideArchetypeVersionId: "archetype-b-v1",
      submissionInput: {
        mode: "read",
        query: { objectType: "logical_form_submission", objectId: "submission-1" }
      }
    })
  );

  const history = appendAssignmentHistory(
    appendAssignmentHistory([], first.assignment),
    overridden.assignment
  );
  assert.equal(overridden.assignment.archetypeVersionId, "archetype-b-v1");
  assert.equal(overridden.assignment.reason, "override");
  assert.equal(overridden.assignment.override?.actorObjectId, "operator-1");
  assert.equal(currentAssignment(history)?.assignmentId, overridden.assignment.assignmentId);
});

test("requires HubSpot persistence for every matched activation", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const configurationQuery = await seedConfiguration(
    adapter,
    baseConfiguration(),
    "configuration-activation-target"
  );

  await assert.rejects(
    () => executeConfigurableProductFlow(
      execution({
        adapter,
        configurationQuery,
        suffix: "activation-target",
        activationTarget: false
      })
    ),
    (error: unknown) =>
      error instanceof ConfigurableProductError &&
      error.code === "ACTIVATION_TARGET_REQUIRED"
  );
});
