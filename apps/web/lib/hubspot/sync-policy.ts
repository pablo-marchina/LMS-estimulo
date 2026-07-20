import {
  HubSpotContractError,
  type GovernedHubSpotWriteCommand,
  type HubSpotAllowedSyncClassification,
  type HubSpotBusinessRecordKind,
  type HubSpotSensitivity,
  type HubSpotSyncClassification,
  type JsonObject,
  type JsonPrimitive,
} from "./contracts.js";

export type HubSpotFieldCode =
  | "identity.user_account_id"
  | "identity.business_id"
  | "journey.started_at"
  | "journey.completed_at"
  | "activity.completed_at"
  | "credential.issued_at"
  | "utility.rating"
  | "business_maturity.result"
  | "official_archetype.result"
  | "diagnostic.raw_response"
  | "comment.body"
  | "file.binary"
  | "file.signed_url"
  | "editorial.configuration"
  | "technical.log"
  | "technical.trace"
  | "queue.payload"
  | "retry.payload"
  | "secret.value";

export type HubSpotSyncCandidate = {
  fieldCode: HubSpotFieldCode;
  sourceRecordId: string;
  sourceRecordHash: string;
  occurredAt: string;
  sensitivity: HubSpotSensitivity;
  value: JsonPrimitive;
  objectId: string;
  idempotencyKey: string;
};

export type HubSpotDestinationApproval = {
  approvalId: string;
  fieldCode: HubSpotFieldCode;
  syncClassification: HubSpotAllowedSyncClassification;
  objectType: string;
  propertyName: string;
  businessPurpose: string;
  calculationOrEngagementUse: string;
  maximumSensitivity: HubSpotSensitivity;
  requiresReadback: boolean;
  kind: HubSpotBusinessRecordKind;
};

export type HubSpotSyncDecision =
  | {
      decision: "write";
      command: GovernedHubSpotWriteCommand<JsonObject>;
    }
  | {
      decision: "not_synced";
      classification: "not_synced";
      reason: string;
    };

const semanticClassification: Readonly<Record<HubSpotFieldCode, {
  classification: HubSpotSyncClassification;
  reason: string;
}>> = Object.freeze({
  "identity.user_account_id": { classification: "linking_identifier", reason: "minimum LMS user linkage" },
  "identity.business_id": { classification: "linking_identifier", reason: "minimum LMS business linkage" },
  "journey.started_at": { classification: "engagement_signal", reason: "approved aggregate journey milestone candidate" },
  "journey.completed_at": { classification: "engagement_signal", reason: "approved aggregate journey milestone candidate" },
  "activity.completed_at": { classification: "engagement_signal", reason: "approved aggregate activity milestone candidate" },
  "credential.issued_at": { classification: "engagement_signal", reason: "approved aggregate credential milestone candidate" },
  "utility.rating": { classification: "not_synced", reason: "pending approved engagement signal catalog" },
  "business_maturity.result": { classification: "not_synced", reason: "draft methodology and privacy governance pending" },
  "official_archetype.result": { classification: "not_synced", reason: "official methodology and destination inventory pending" },
  "diagnostic.raw_response": { classification: "not_synced", reason: "raw educational response excluded by default" },
  "comment.body": { classification: "not_synced", reason: "open text excluded without specific privacy approval" },
  "file.binary": { classification: "not_synced", reason: "binary content excluded" },
  "file.signed_url": { classification: "not_synced", reason: "signed URLs excluded" },
  "editorial.configuration": { classification: "not_synced", reason: "editorial configuration excluded" },
  "technical.log": { classification: "not_synced", reason: "technical logs excluded" },
  "technical.trace": { classification: "not_synced", reason: "technical traces excluded" },
  "queue.payload": { classification: "not_synced", reason: "queue payloads excluded" },
  "retry.payload": { classification: "not_synced", reason: "retry payloads excluded" },
  "secret.value": { classification: "not_synced", reason: "secrets are forbidden" },
});

const sensitivityRank: Readonly<Record<HubSpotSensitivity, number>> = Object.freeze({
  operational: 0,
  personal: 1,
  sensitive: 2,
  restricted: 3,
});

const propertyNamePattern = /^[a-z][a-z0-9_]{1,99}$/;
const sourceHashPattern = /^[a-f0-9]{64}$/;

function nonEmpty(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new HubSpotContractError(code, `${code} must not be empty.`);
  return normalized;
}

function assertTimestamp(value: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new HubSpotContractError("HUBSPOT_SYNC_OCCURRED_AT_INVALID", "occurredAt must be an ISO timestamp.");
  }
  return value;
}

export function classifyHubSpotCandidate(fieldCode: HubSpotFieldCode) {
  return semanticClassification[fieldCode];
}

export function buildHubSpotSyncDecision(
  candidate: HubSpotSyncCandidate,
  approvals: readonly HubSpotDestinationApproval[],
): HubSpotSyncDecision {
  const semantic = classifyHubSpotCandidate(candidate.fieldCode);
  if (semantic.classification === "not_synced") {
    return { decision: "not_synced", classification: "not_synced", reason: semantic.reason };
  }

  const matches = approvals.filter((approval) => approval.fieldCode === candidate.fieldCode);
  if (matches.length === 0) {
    return {
      decision: "not_synced",
      classification: "not_synced",
      reason: "blocked_pending_hubspot_destination_inventory",
    };
  }
  if (matches.length !== 1) {
    throw new HubSpotContractError(
      "HUBSPOT_DESTINATION_APPROVAL_AMBIGUOUS",
      "Exactly one approved destination must exist for a HubSpot field."
    );
  }
  const approval = matches[0]!;
  if (approval.syncClassification !== semantic.classification) {
    throw new HubSpotContractError(
      "HUBSPOT_DESTINATION_CLASSIFICATION_MISMATCH",
      "The approved destination classification does not match the canonical semantic policy."
    );
  }
  if (sensitivityRank[candidate.sensitivity] > sensitivityRank[approval.maximumSensitivity]) {
    return {
      decision: "not_synced",
      classification: "not_synced",
      reason: "candidate_sensitivity_exceeds_approved_destination",
    };
  }
  if (!propertyNamePattern.test(approval.propertyName)) {
    throw new HubSpotContractError("HUBSPOT_PROPERTY_NAME_INVALID", "Approved property name is invalid.");
  }
  if (!sourceHashPattern.test(candidate.sourceRecordHash)) {
    throw new HubSpotContractError("HUBSPOT_SOURCE_HASH_INVALID", "sourceRecordHash must be a SHA-256 hex digest.");
  }

  const objectId = nonEmpty(candidate.objectId, "HUBSPOT_OBJECT_ID_REQUIRED");
  const sourceRecordId = nonEmpty(candidate.sourceRecordId, "HUBSPOT_SOURCE_RECORD_ID_REQUIRED");
  const occurredAt = assertTimestamp(candidate.occurredAt);
  const idempotencyKey = nonEmpty(candidate.idempotencyKey, "HUBSPOT_IDEMPOTENCY_KEY_REQUIRED");

  return {
    decision: "write",
    command: {
      idempotencyKey,
      kind: approval.kind,
      objectType: approval.objectType,
      objectId,
      payload: { [approval.propertyName]: candidate.value },
      governance: {
        syncClassification: approval.syncClassification,
        businessPurpose: nonEmpty(approval.businessPurpose, "HUBSPOT_BUSINESS_PURPOSE_REQUIRED"),
        calculationOrEngagementUse: nonEmpty(
          approval.calculationOrEngagementUse,
          "HUBSPOT_CALCULATION_OR_ENGAGEMENT_USE_REQUIRED"
        ),
        sourceRecordId,
        sourceRecordHash: candidate.sourceRecordHash,
        sensitivity: candidate.sensitivity,
        occurredAt,
        requiresReadback: approval.requiresReadback,
        associationTargets: [],
        approvedDestinationId: nonEmpty(approval.approvalId, "HUBSPOT_DESTINATION_APPROVAL_ID_REQUIRED"),
        approvedObjectType: approval.objectType,
        approvedPropertyNames: [approval.propertyName],
      },
    },
  };
}

export const emptyHubSpotDestinationRegistry: readonly HubSpotDestinationApproval[] = Object.freeze([]);
