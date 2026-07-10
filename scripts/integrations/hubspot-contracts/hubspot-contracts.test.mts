import test from "node:test";
import assert from "node:assert/strict";
import {
  HubSpotContractError,
  assertVerifiedHubSpotSource,
  type HubSpotSnapshot,
  type HubSpotSnapshotQuery,
  type HubSpotWriteCommand,
  type HubSpotWriteReceipt,
  type JsonObject
} from "../../../apps/web/lib/hubspot/contracts.js";
import type { HubSpotDataGateway } from "../../../apps/web/lib/hubspot/gateway.js";
import { InMemoryHubSpotAdapter } from "../../../apps/web/lib/hubspot/in-memory-adapter.js";
import { executeHubSpotSourcedDecision } from "../../../apps/web/lib/hubspot/write-readback-use.js";

type SubmissionPayload = {
  formVersionId: string;
  answers: { questionId: string; optionCode: string }[];
};

type DecisionPayload = {
  archetypeCode: string;
  classificationPolicyVersionId: string;
};

type AssignmentPayload = {
  archetypeCode: string;
  classificationPolicyVersionId: string;
  inputSnapshotHash: string;
};

const fixedNow = new Date("2026-07-10T06:00:00.000Z");
const noWait = async (): Promise<void> => undefined;

function submissionCommand(payload: SubmissionPayload): HubSpotWriteCommand<SubmissionPayload> {
  return {
    idempotencyKey: "submission-command-1",
    kind: "collected_data",
    objectType: "form_submission",
    objectId: "submission-1",
    expectedVersion: "0",
    payload
  };
}

function executionFor(
  gateway: HubSpotDataGateway,
  decide: (input: HubSpotSnapshot<SubmissionPayload>) => DecisionPayload
) {
  return {
    gateway,
    decisionId: "decision-1",
    policyVersionId: "classification-policy-v1",
    inputWrite: submissionCommand({
      formVersionId: "form-v1",
      answers: [{ questionId: "q1", optionCode: "a" }]
    }),
    decide,
    buildResultWrite: (
      decision: DecisionPayload,
      input: HubSpotSnapshot<SubmissionPayload>
    ): HubSpotWriteCommand<AssignmentPayload> => ({
      idempotencyKey: "assignment-command-1",
      kind: "business_result",
      objectType: "archetype_assignment",
      objectId: "assignment-1",
      expectedVersion: "0",
      payload: {
        ...decision,
        inputSnapshotHash: input.source.snapshotHash
      }
    }),
    now: () => new Date(fixedNow),
    retry: { maxAttempts: 4, delayMs: 0, sleep: noWait }
  };
}

test("persists, confirms, decides, persists the result and confirms it", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  let decisionCalls = 0;

  const outcome = await executeHubSpotSourcedDecision(
    executionFor(adapter, (input) => {
      decisionCalls += 1;
      assert.equal(input.source.objectType, "form_submission");
      assert.equal(input.payload.answers[0]?.optionCode, "a");
      return {
        archetypeCode: "builder",
        classificationPolicyVersionId: "classification-policy-v1"
      };
    })
  );

  assert.equal(decisionCalls, 1);
  assert.equal(outcome.result.payload.archetypeCode, "builder");
  assert.equal(outcome.evidence.inputSources[0]?.snapshotHash, outcome.input.source.snapshotHash);
  assert.equal(outcome.evidence.resultSource.snapshotHash, outcome.result.source.snapshotHash);
  assert.deepEqual(adapter.metrics(), {
    attempts: { write: 2, readBack: 2, read: 0 },
    committedWrites: 2,
    storedObjects: 2
  });
});

test("retries rate limits and eventual consistency without duplicating writes", async () => {
  const adapter = new InMemoryHubSpotAdapter({
    now: () => new Date(fixedNow),
    readBackVisibilityDelay: 2
  });
  adapter.planFault({
    operation: "write",
    code: "HUBSPOT_RATE_LIMITED",
    message: "Rate limit reached.",
    retryable: true,
    status: 429
  });

  let decisionCalls = 0;
  const outcome = await executeHubSpotSourcedDecision(
    executionFor(adapter, () => {
      decisionCalls += 1;
      return {
        archetypeCode: "planner",
        classificationPolicyVersionId: "classification-policy-v1"
      };
    })
  );

  assert.equal(outcome.result.payload.archetypeCode, "planner");
  assert.equal(decisionCalls, 1);
  assert.deepEqual(adapter.metrics(), {
    attempts: { write: 3, readBack: 6, read: 0 },
    committedWrites: 2,
    storedObjects: 2
  });
});

test("never executes a decision when readback cannot be confirmed", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  adapter.planFault({
    operation: "readBack",
    code: "HUBSPOT_UNAVAILABLE",
    message: "HubSpot is unavailable.",
    retryable: true,
    status: 503,
    occurrences: 4
  });

  let decisionCalls = 0;
  await assert.rejects(
    () => executeHubSpotSourcedDecision(
      executionFor(adapter, () => {
        decisionCalls += 1;
        return {
          archetypeCode: "forbidden",
          classificationPolicyVersionId: "classification-policy-v1"
        };
      })
    ),
    (error: unknown) =>
      error instanceof HubSpotContractError && error.code === "HUBSPOT_UNAVAILABLE"
  );

  assert.equal(decisionCalls, 0);
  assert.equal(adapter.metrics().committedWrites, 1);
  assert.equal(adapter.metrics().storedObjects, 1);
});

test("replays identical idempotent writes and rejects key reuse with different data", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const command = submissionCommand({
    formVersionId: "form-v1",
    answers: [{ questionId: "q1", optionCode: "a" }]
  });

  const first = await adapter.write(command);
  const replay = await adapter.write(command);

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(first.writeId, replay.writeId);
  assert.equal(adapter.metrics().committedWrites, 1);

  await assert.rejects(
    () => adapter.write({
      ...command,
      payload: {
        formVersionId: "form-v1",
        answers: [{ questionId: "q1", optionCode: "b" }]
      }
    }),
    (error: unknown) =>
      error instanceof HubSpotContractError &&
      error.code === "HUBSPOT_IDEMPOTENCY_KEY_REUSED"
  );
});

test("detects optimistic concurrency conflicts after an external HubSpot update", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const firstReceipt = await adapter.write(submissionCommand({
    formVersionId: "form-v1",
    answers: [{ questionId: "q1", optionCode: "a" }]
  }));
  const firstSnapshot = await adapter.readBack<SubmissionPayload>(firstReceipt);

  adapter.mutateExternally(
    { objectType: "form_submission", objectId: "submission-1" },
    {
      formVersionId: "form-v1",
      answers: [{ questionId: "q1", optionCode: "external-change" }]
    }
  );

  await assert.rejects(
    () => adapter.write({
      idempotencyKey: "submission-command-2",
      kind: "collected_data",
      objectType: "form_submission",
      objectId: "submission-1",
      expectedVersion: firstSnapshot.source.propertyOrPayloadVersion,
      payload: {
        formVersionId: "form-v1",
        answers: [{ questionId: "q1", optionCode: "local-change" }]
      }
    }),
    (error: unknown) =>
      error instanceof HubSpotContractError && error.code === "HUBSPOT_VERSION_CONFLICT"
  );
});

test("rejects stale HubSpot-sourced snapshots", () => {
  assert.throws(
    () => assertVerifiedHubSpotSource(
      {
        portalId: "portal-1",
        objectType: "form_submission",
        objectId: "submission-1",
        propertyOrPayloadVersion: "1",
        hubspotUpdatedAt: "2026-07-10T05:00:00.000Z",
        retrievedAt: "2026-07-10T05:00:00.000Z",
        snapshotHash: "hash-1"
      },
      { now: fixedNow, maxAgeMs: 1_000 }
    ),
    (error: unknown) =>
      error instanceof HubSpotContractError && error.code === "HUBSPOT_SOURCE_STALE"
  );
});

class CorruptingReadbackGateway implements HubSpotDataGateway {
  constructor(private readonly inner: HubSpotDataGateway) {}

  write<T extends JsonObject>(command: HubSpotWriteCommand<T>): Promise<HubSpotWriteReceipt> {
    return this.inner.write(command);
  }

  async readBack<T extends JsonObject>(receipt: HubSpotWriteReceipt): Promise<HubSpotSnapshot<T>> {
    const snapshot = await this.inner.readBack<T>(receipt);
    return {
      ...snapshot,
      source: { ...snapshot.source, snapshotHash: "corrupted-hash" }
    };
  }

  read<T extends JsonObject>(query: HubSpotSnapshotQuery): Promise<HubSpotSnapshot<T>> {
    return this.inner.read<T>(query);
  }
}

test("rejects a readback hash mismatch before invoking business logic", async () => {
  const adapter = new InMemoryHubSpotAdapter({ now: () => new Date(fixedNow) });
  const gateway = new CorruptingReadbackGateway(adapter);
  let decisionCalls = 0;

  await assert.rejects(
    () => executeHubSpotSourcedDecision(
      executionFor(gateway, () => {
        decisionCalls += 1;
        return {
          archetypeCode: "forbidden",
          classificationPolicyVersionId: "classification-policy-v1"
        };
      })
    ),
    (error: unknown) =>
      error instanceof HubSpotContractError &&
      error.code === "HUBSPOT_READBACK_HASH_MISMATCH"
  );

  assert.equal(decisionCalls, 0);
});
