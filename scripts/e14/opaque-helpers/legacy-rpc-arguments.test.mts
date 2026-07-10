import test from "node:test";
import assert from "node:assert/strict";
import { legacyE14RpcArguments } from "../../../apps/web/lib/e14/legacy-rpc-arguments.js";

test("maps all eight frozen public RPC argument aliases", () => {
  assert.deepEqual(
    legacyE14RpcArguments.completeDiagnostic({
      actorUserAccountId: "actor",
      sessionId: "session",
      expectedAggregateVersion: 3,
      idempotencyKey: "complete-key"
    }),
    { a: "actor", b: "session", c: 3, d: "complete-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.startActivity({
      actorUserAccountId: "actor",
      stepInstanceId: "step",
      expectedAggregateVersion: 4,
      idempotencyKey: "activity-key"
    }),
    { a: "actor", b: "step", c: 4, d: "activity-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.acknowledgeSection({
      actorUserAccountId: "actor",
      activitySessionId: "activity-session",
      sectionCode: "input",
      acknowledged: true,
      idempotencyKey: "section-key"
    }),
    { a: "actor", b: "activity-session", c: "input", d: true, e: "section-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.startQuickCheck({
      actorUserAccountId: "actor",
      stepInstanceId: "step",
      idempotencyKey: "quick-start-key"
    }),
    { a: "actor", b: "step", c: "quick-start-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.recordQuickCheckAnswer({
      actorUserAccountId: "actor",
      attemptId: "attempt",
      questionId: "question",
      optionCode: "b",
      idempotencyKey: "answer-key"
    }),
    { a: "actor", b: "attempt", c: "question", d: "b", e: "answer-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.submitQuickCheck({
      actorUserAccountId: "actor",
      attemptId: "attempt",
      expectedAggregateVersion: 2,
      idempotencyKey: "submit-key"
    }),
    { a: "actor", b: "attempt", c: 2, d: "submit-key" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.getParticipantState({
      actorUserAccountId: "actor",
      journeyInstanceId: "journey"
    }),
    { a: "actor", b: "journey" }
  );

  assert.deepEqual(
    legacyE14RpcArguments.getOperatorResult({
      actorUserAccountId: "actor",
      organizationId: "organization",
      journeyInstanceId: "journey"
    }),
    { a: "actor", b: "organization", c: "journey" }
  );
});
