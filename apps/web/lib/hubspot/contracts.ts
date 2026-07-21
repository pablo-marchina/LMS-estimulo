export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type HubSpotBusinessRecordKind =
  | "collected_data"
  | "business_result"
  | "configuration"
  | "activation_execution";

export type HubSpotSyncClassification =
  | "linking_identifier"
  | "engagement_signal"
  | "calculation_input_or_result"
  | "not_synced";

export type HubSpotAllowedSyncClassification = Exclude<HubSpotSyncClassification, "not_synced">;
export type HubSpotSensitivity = "operational" | "personal" | "sensitive" | "restricted";
export type HubSpotAssociationTarget = {
  objectType: string;
  objectId: string;
  associationType?: string;
};

export type HubSpotCommandGovernance = {
  syncClassification: HubSpotAllowedSyncClassification;
  businessPurpose: string;
  calculationOrEngagementUse: string;
  sourceRecordId: string;
  sourceRecordHash: string;
  sensitivity: HubSpotSensitivity;
  occurredAt: string;
  requiresReadback: boolean;
  associationTargets: HubSpotAssociationTarget[];
  approvedDestinationId: string;
  approvedObjectType: string;
  approvedPropertyNames: string[];
};

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
  governance?: HubSpotCommandGovernance;
};

export type GovernedHubSpotWriteCommand<T extends JsonObject = JsonObject> =
  HubSpotWriteCommand<T> & {
    objectId: string;
    governance: HubSpotCommandGovernance;
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
  propertyNames?: string[];
};

export type HubSpotSnapshotQuery = {
  objectType: string;
  objectId: string;
  properties?: string[];
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
