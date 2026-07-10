import type { HubSpotDataGateway } from "./gateway.js";
import {
  HubSpotContractError,
  assertVerifiedHubSpotSource,
  type BusinessDecisionEvidence,
  type HubSpotSnapshot,
  type HubSpotWriteCommand,
  type HubSpotWriteReceipt,
  type JsonObject
} from "./contracts.js";

export type HubSpotRetryPolicy = {
  maxAttempts: number;
  delayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
};

export type HubSpotDecisionExecution<
  TInput extends JsonObject,
  TDecision extends JsonObject,
  TResult extends JsonObject
> = {
  gateway: HubSpotDataGateway;
  decisionId: string;
  policyVersionId: string;
  inputWrite: HubSpotWriteCommand<TInput>;
  decide: (confirmedInput: HubSpotSnapshot<TInput>) => Promise<TDecision> | TDecision;
  buildResultWrite: (
    decision: TDecision,
    confirmedInput: HubSpotSnapshot<TInput>
  ) => HubSpotWriteCommand<TResult>;
  now?: () => Date;
  maxSnapshotAgeMs?: number;
  retry?: HubSpotRetryPolicy;
};

export type HubSpotDecisionResult<
  TInput extends JsonObject,
  TDecision extends JsonObject,
  TResult extends JsonObject
> = {
  input: HubSpotSnapshot<TInput>;
  decision: TDecision;
  result: HubSpotSnapshot<TResult>;
  evidence: BusinessDecisionEvidence;
};

const defaultSleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

function validateRetryPolicy(policy: HubSpotRetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts <= 0) {
    throw new HubSpotContractError(
      "HUBSPOT_RETRY_POLICY_INVALID",
      "maxAttempts must be a positive integer."
    );
  }
  if (policy.delayMs !== undefined && (!Number.isFinite(policy.delayMs) || policy.delayMs < 0)) {
    throw new HubSpotContractError(
      "HUBSPOT_RETRY_POLICY_INVALID",
      "delayMs must be a non-negative finite number."
    );
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  policy: HubSpotRetryPolicy
): Promise<T> {
  validateRetryPolicy(policy);
  const sleep = policy.sleep ?? defaultSleep;
  const delayMs = policy.delayMs ?? 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof HubSpotContractError && error.retryable;
      if (!retryable || attempt === policy.maxAttempts) throw error;
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function verifyReceiptMatchesSnapshot(
  receipt: HubSpotWriteReceipt,
  snapshot: HubSpotSnapshot,
  now: Date,
  maxSnapshotAgeMs: number
): void {
  if (
    snapshot.source.portalId !== receipt.portalId ||
    snapshot.source.objectType !== receipt.objectType ||
    snapshot.source.objectId !== receipt.objectId ||
    snapshot.source.propertyOrPayloadVersion !== receipt.expectedVersion
  ) {
    throw new HubSpotContractError(
      "HUBSPOT_READBACK_IDENTITY_MISMATCH",
      "HubSpot readback does not identify the accepted object version."
    );
  }

  assertVerifiedHubSpotSource(snapshot.source, {
    now,
    maxAgeMs: maxSnapshotAgeMs,
    expectedHash: receipt.expectedPayloadHash
  });
}

export async function executeHubSpotSourcedDecision<
  TInput extends JsonObject,
  TDecision extends JsonObject,
  TResult extends JsonObject
>(
  execution: HubSpotDecisionExecution<TInput, TDecision, TResult>
): Promise<HubSpotDecisionResult<TInput, TDecision, TResult>> {
  const now = execution.now ?? (() => new Date());
  const maxSnapshotAgeMs = execution.maxSnapshotAgeMs ?? 60_000;
  const retry = execution.retry ?? { maxAttempts: 3, delayMs: 0 };

  const inputReceipt = await withRetry(
    () => execution.gateway.write(execution.inputWrite),
    retry
  );
  const confirmedInput = await withRetry(
    () => execution.gateway.readBack<TInput>(inputReceipt),
    retry
  );
  verifyReceiptMatchesSnapshot(inputReceipt, confirmedInput, now(), maxSnapshotAgeMs);

  const decision = await execution.decide(confirmedInput);
  const resultWrite = execution.buildResultWrite(decision, confirmedInput);
  const resultReceipt = await withRetry(
    () => execution.gateway.write(resultWrite),
    retry
  );
  const confirmedResult = await withRetry(
    () => execution.gateway.readBack<TResult>(resultReceipt),
    retry
  );
  verifyReceiptMatchesSnapshot(resultReceipt, confirmedResult, now(), maxSnapshotAgeMs);

  return {
    input: confirmedInput,
    decision,
    result: confirmedResult,
    evidence: {
      decisionId: execution.decisionId,
      policyVersionId: execution.policyVersionId,
      executedAt: now().toISOString(),
      inputSources: [confirmedInput.source],
      resultSource: confirmedResult.source
    }
  };
}
