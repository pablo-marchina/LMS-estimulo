export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type HubSpotBusinessRecordKind =
  | "collected_data"
  | "business_result"
  | "configuration"
  | "activation_execution";

export type HubSpotSource = {
  portalId: string;
  objectType: string;
  objectId: string;
  propertyOrPayloadVersion: string;
  hubspotUpdatedAt: string;
  retrievedAt: string;
  snapshotHash: string;
};

export type HubSpotSnapshot<T extends JsonObject = JsonObject> = {
  source: HubSpotSource;
  payload: T;
};

export type HubSpotWriteCommand<T extends JsonObject = JsonObject> = {
  idempotencyKey: string;
  kind: HubSpotBusinessRecordKind;
  objectType: string;
  objectId?: string;
  expectedVersion?: string;
  payload: T;
};

export type HubSpotWriteReceipt = {
  portalId: string;
  objectType: string;
  objectId: string;
  writeId: string;
  acceptedAt: string;
  expectedPayloadHash: string;
  expectedVersion: string;
  replayed: boolean;
};

export type HubSpotSnapshotQuery = {
  objectType: string;
  objectId: string;
};

export type BusinessDecisionEvidence = {
  decisionId: string;
  policyVersionId: string;
  executedAt: string;
  inputSources: HubSpotSource[];
  resultSource: HubSpotSource;
};

export type SourceValidationOptions = {
  now: Date;
  maxAgeMs: number;
  expectedHash?: string;
};

export class HubSpotContractError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; details?: JsonObject } = {}
  ) {
    super(message);
    this.name = "HubSpotContractError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

function requireNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new HubSpotContractError(
      "HUBSPOT_SOURCE_INVALID",
      `HubSpot source field ${field} must not be empty.`
    );
  }
}

function parseTimestamp(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new HubSpotContractError(
      "HUBSPOT_SOURCE_INVALID",
      `HubSpot source field ${field} is not a valid timestamp.`
    );
  }
  return parsed;
}

export function assertVerifiedHubSpotSource(
  source: HubSpotSource,
  options: SourceValidationOptions
): void {
  requireNonEmpty(source.portalId, "portalId");
  requireNonEmpty(source.objectType, "objectType");
  requireNonEmpty(source.objectId, "objectId");
  requireNonEmpty(source.propertyOrPayloadVersion, "propertyOrPayloadVersion");
  requireNonEmpty(source.snapshotHash, "snapshotHash");

  const retrievedAt = parseTimestamp(source.retrievedAt, "retrievedAt");
  parseTimestamp(source.hubspotUpdatedAt, "hubspotUpdatedAt");

  const ageMs = options.now.getTime() - retrievedAt;
  if (ageMs < 0) {
    throw new HubSpotContractError(
      "HUBSPOT_SOURCE_FROM_FUTURE",
      "HubSpot snapshot retrieval timestamp is in the future."
    );
  }

  if (ageMs > options.maxAgeMs) {
    throw new HubSpotContractError(
      "HUBSPOT_SOURCE_STALE",
      "HubSpot snapshot is too old to be used by a business decision.",
      { details: { ageMs, maxAgeMs: options.maxAgeMs } }
    );
  }

  if (options.expectedHash && source.snapshotHash !== options.expectedHash) {
    throw new HubSpotContractError(
      "HUBSPOT_READBACK_HASH_MISMATCH",
      "HubSpot readback does not match the payload accepted for writing."
    );
  }
}
