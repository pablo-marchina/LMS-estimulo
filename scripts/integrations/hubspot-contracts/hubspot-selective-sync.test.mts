import test from "node:test";
import assert from "node:assert/strict";
import {
  HubSpotContractError,
  type GovernedHubSpotWriteCommand,
  type JsonObject,
} from "../../../apps/web/lib/hubspot/contracts.js";
import {
  buildHubSpotSyncDecision,
  classifyHubSpotCandidate,
  emptyHubSpotDestinationRegistry,
  type HubSpotDestinationApproval,
  type HubSpotSyncCandidate,
} from "../../../apps/web/lib/hubspot/sync-policy.js";
import { HubSpotHttpAdapter } from "../../../apps/web/lib/hubspot/http-adapter-core.js";

const occurredAt = "2026-07-20T18:00:00.000Z";
const sourceHash = "a".repeat(64);

function candidate(overrides: Partial<HubSpotSyncCandidate> = {}): HubSpotSyncCandidate {
  return {
    fieldCode: "identity.user_account_id",
    sourceRecordId: "user-account-1",
    sourceRecordHash: sourceHash,
    occurredAt,
    sensitivity: "personal",
    value: "user-account-1",
    objectId: "12345",
    idempotencyKey: "hubspot-sync-user-1",
    ...overrides,
  };
}

const contactLinkApproval: HubSpotDestinationApproval = {
  approvalId: "inventory-v1:contact:lms-user-id",
  fieldCode: "identity.user_account_id",
  syncClassification: "linking_identifier",
  objectType: "contacts",
  propertyName: "estimulo_lms_user_account_id",
  businessPurpose: "Link the HubSpot contact to the canonical LMS account.",
  calculationOrEngagementUse: "Identity linkage only.",
  maximumSensitivity: "personal",
  requiresReadback: true,
  kind: "collected_data",
};

function governedCommand(
  overrides: Partial<GovernedHubSpotWriteCommand<JsonObject>> = {},
): GovernedHubSpotWriteCommand<JsonObject> {
  const decision = buildHubSpotSyncDecision(candidate(), [contactLinkApproval]);
  assert.equal(decision.decision, "write");
  return {
    ...decision.command,
    ...overrides,
    governance: {
      ...decision.command.governance,
      ...(overrides.governance ?? {}),
    },
  };
}

test("semantic policy excludes raw, binary, technical and unapproved behavioral data", () => {
  for (const fieldCode of [
    "utility.rating",
    "business_maturity.result",
    "official_archetype.result",
    "diagnostic.raw_response",
    "comment.body",
    "file.binary",
    "file.signed_url",
    "editorial.configuration",
    "technical.log",
    "technical.trace",
    "queue.payload",
    "retry.payload",
    "secret.value",
  ] as const) {
    assert.equal(classifyHubSpotCandidate(fieldCode).classification, "not_synced");
  }
});

test("eligible data stays blocked until one exact portal destination is approved", () => {
  const decision = buildHubSpotSyncDecision(candidate(), emptyHubSpotDestinationRegistry);
  assert.deepEqual(decision, {
    decision: "not_synced",
    classification: "not_synced",
    reason: "blocked_pending_hubspot_destination_inventory",
  });
});

test("approved destination creates a governed single-property command", () => {
  const decision = buildHubSpotSyncDecision(candidate(), [contactLinkApproval]);
  assert.equal(decision.decision, "write");
  if (decision.decision !== "write") return;
  assert.equal(decision.command.objectType, "contacts");
  assert.equal(decision.command.objectId, "12345");
  assert.deepEqual(decision.command.payload, {
    estimulo_lms_user_account_id: "user-account-1",
  });
  assert.equal(decision.command.governance.syncClassification, "linking_identifier");
  assert.deepEqual(decision.command.governance.approvedPropertyNames, [
    "estimulo_lms_user_account_id",
  ]);
});

test("approval ambiguity, classification mismatch and excessive sensitivity fail closed", () => {
  assert.throws(
    () => buildHubSpotSyncDecision(candidate(), [contactLinkApproval, { ...contactLinkApproval, approvalId: "duplicate" }]),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_DESTINATION_APPROVAL_AMBIGUOUS",
  );
  assert.throws(
    () => buildHubSpotSyncDecision(candidate(), [{ ...contactLinkApproval, syncClassification: "engagement_signal" }]),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_DESTINATION_CLASSIFICATION_MISMATCH",
  );
  const restricted = buildHubSpotSyncDecision(candidate({ sensitivity: "restricted" }), [contactLinkApproval]);
  assert.equal(restricted.decision, "not_synced");
});

test("HTTP adapter patches by explicit internal ID and confirms only approved properties", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const responses = [
    new Response(JSON.stringify({
      id: "12345",
      updatedAt: "2026-07-20T18:01:00.000Z",
      properties: { estimulo_lms_user_account_id: "user-account-1" },
      objectWriteTraceId: "trace-1",
    }), { status: 200, headers: { "content-type": "application/json" } }),
    new Response(JSON.stringify({
      id: "12345",
      updatedAt: "2026-07-20T18:01:00.000Z",
      properties: { estimulo_lms_user_account_id: "user-account-1" },
    }), { status: 200, headers: { "content-type": "application/json" } }),
  ];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: new URL(String(input)), init: init ?? {} });
    return responses.shift()!;
  };
  const adapter = new HubSpotHttpAdapter({
    privateAppToken: "private-token",
    portalId: "portal-1",
    fetchImpl: fetchImpl as typeof fetch,
    now: () => new Date("2026-07-20T18:01:01.000Z"),
  });

  const receipt = await adapter.write(governedCommand());
  const snapshot = await adapter.readBack(receipt);

  assert.equal(calls[0]?.init.method, "PATCH");
  assert.equal(calls[0]?.url.toString(), "https://api.hubapi.com/crm/v3/objects/contacts/12345");
  assert.equal((calls[0]?.init.headers as Record<string, string>).authorization, "Bearer private-token");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), {
    properties: { estimulo_lms_user_account_id: "user-account-1" },
  });
  assert.equal(calls[1]?.init.method, "GET");
  assert.equal(calls[1]?.url.searchParams.get("properties"), "estimulo_lms_user_account_id");
  assert.equal(calls[1]?.url.searchParams.has("idProperty"), false);
  assert.equal(snapshot.source.snapshotHash, receipt.expectedPayloadHash);
});

test("HTTP adapter rejects ambiguous IDs, ungoverned writes and destination substitution", async () => {
  const adapter = new HubSpotHttpAdapter({
    privateAppToken: "private-token",
    portalId: "portal-1",
    fetchImpl: (async () => { throw new Error("must not call"); }) as typeof fetch,
  });

  await assert.rejects(
    () => adapter.write({
      idempotencyKey: "legacy",
      kind: "collected_data",
      objectType: "contacts",
      objectId: "email@example.com",
      payload: { email: "email@example.com" },
    }),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_GOVERNANCE_METADATA_REQUIRED",
  );
  await assert.rejects(
    () => adapter.write(governedCommand({ objectId: "external-business-lead-id" })),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_INTERNAL_OBJECT_ID_REQUIRED",
  );
  await assert.rejects(
    () => adapter.write(governedCommand({ objectType: "deals" })),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_APPROVED_DESTINATION_MISMATCH",
  );
  await assert.rejects(
    () => adapter.write(governedCommand({ payload: { unauthorized_property: "value" } })),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_APPROVED_DESTINATION_MISMATCH",
  );
});

test("HTTP adapter classifies rate limits and server errors as retryable", async () => {
  for (const status of [423, 429, 477, 502, 503, 504]) {
    const adapter = new HubSpotHttpAdapter({
      privateAppToken: "private-token",
      portalId: "portal-1",
      fetchImpl: (async () => new Response(JSON.stringify({ message: "temporary" }), {
        status,
        headers: { "retry-after": "2" },
      })) as typeof fetch,
    });
    await assert.rejects(
      () => adapter.write(governedCommand({ idempotencyKey: `temporary-${status}` })),
      (error: unknown) => error instanceof HubSpotContractError
        && error.code === "HUBSPOT_TEMPORARY_FAILURE"
        && error.retryable
        && error.details?.retryAfterMs === 2000,
    );
  }
});

test("HTTP adapter treats validation and authorization failures as permanent", async () => {
  for (const status of [400, 401, 403, 404]) {
    const adapter = new HubSpotHttpAdapter({
      privateAppToken: "private-token",
      portalId: "portal-1",
      fetchImpl: (async () => new Response(JSON.stringify({
        status: "error",
        category: "VALIDATION_ERROR",
        correlationId: "correlation-1",
        message: "rejected",
      }), { status })) as typeof fetch,
    });
    await assert.rejects(
      () => adapter.write(governedCommand({ idempotencyKey: `permanent-${status}` })),
      (error: unknown) => error instanceof HubSpotContractError
        && error.code === "HUBSPOT_REQUEST_REJECTED"
        && !error.retryable,
    );
  }
});

test("HTTP adapter enforces idempotency and optimistic version read before write", async () => {
  let calls = 0;
  const adapter = new HubSpotHttpAdapter({
    privateAppToken: "private-token",
    portalId: "portal-1",
    fetchImpl: (async () => {
      calls += 1;
      return new Response(JSON.stringify({
        id: "12345",
        updatedAt: "2026-07-20T18:00:00.000Z",
        properties: { estimulo_lms_user_account_id: "prior" },
      }), { status: 200 });
    }) as typeof fetch,
  });

  await assert.rejects(
    () => adapter.write(governedCommand({ expectedVersion: "2026-07-20T17:00:00.000Z" })),
    (error: unknown) => error instanceof HubSpotContractError
      && error.code === "HUBSPOT_VERSION_CONFLICT",
  );
  assert.equal(calls, 1, "version conflict must stop before PATCH");
});
