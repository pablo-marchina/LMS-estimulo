import type { HubSpotDataGateway } from "./gateway.js";
import {
  HubSpotContractError,
  type GovernedHubSpotWriteCommand,
  type HubSpotSnapshot,
  type HubSpotSnapshotQuery,
  type HubSpotWriteCommand,
  type HubSpotWriteReceipt,
  type JsonObject,
  type JsonPrimitive,
} from "./contracts.js";
import { hashJson } from "./hashing.js";

export type HubSpotFetch = typeof fetch;

export type HubSpotHttpAdapterOptions = {
  privateAppToken: string;
  portalId: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: HubSpotFetch;
  now?: () => Date;
};

type HubSpotApiObject = {
  id: string;
  properties: Record<string, unknown>;
  createdAt?: string;
  updatedAt: string;
  archived?: boolean;
  objectWriteTraceId?: string;
};

type IdempotencyRecord = {
  commandHash: string;
  receipt: HubSpotWriteReceipt;
};

const standardObjectTypes = new Set(["contacts", "companies", "deals", "leads"]);
const customObjectPattern = /^2-\d+$/;
const internalObjectIdPattern = /^\d+$/;
const propertyPattern = /^[a-z][a-z0-9_]{1,99}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const transientStatuses = new Set([408, 423, 425, 429, 477, 502, 503, 504, 521, 522, 523, 524]);

function required(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new HubSpotContractError(code, `${code} must not be empty.`);
  return normalized;
}

function safeApiBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) {
    throw new HubSpotContractError(
      "HUBSPOT_ADAPTER_CONFIGURATION_INVALID",
      "HubSpot API base URL must be an HTTPS origin without credentials, query, or fragment."
    );
  }
  return url.toString().replace(/\/$/u, "");
}

function assertObjectReference(objectType: string, objectId: string): void {
  if (!standardObjectTypes.has(objectType) && !customObjectPattern.test(objectType)) {
    throw new HubSpotContractError(
      "HUBSPOT_OBJECT_TYPE_NOT_APPROVED",
      "HubSpot object type is not in the adapter allowlist."
    );
  }
  if (!internalObjectIdPattern.test(objectId)) {
    throw new HubSpotContractError(
      "HUBSPOT_INTERNAL_OBJECT_ID_REQUIRED",
      "The real adapter accepts only an explicit HubSpot internal numeric object ID."
    );
  }
}

function assertGovernedCommand<T extends JsonObject>(
  command: HubSpotWriteCommand<T>
): asserts command is GovernedHubSpotWriteCommand<T> {
  if (!command.objectId || !command.governance) {
    throw new HubSpotContractError(
      "HUBSPOT_GOVERNANCE_METADATA_REQUIRED",
      "The real adapter requires an explicit object ID and governance metadata."
    );
  }
  const governance = command.governance;
  required(governance.businessPurpose, "HUBSPOT_BUSINESS_PURPOSE_REQUIRED");
  required(governance.calculationOrEngagementUse, "HUBSPOT_CALCULATION_OR_ENGAGEMENT_USE_REQUIRED");
  required(governance.sourceRecordId, "HUBSPOT_SOURCE_RECORD_ID_REQUIRED");
  required(governance.approvedDestinationId, "HUBSPOT_DESTINATION_APPROVAL_ID_REQUIRED");
  if (!sha256Pattern.test(governance.sourceRecordHash)) {
    throw new HubSpotContractError("HUBSPOT_SOURCE_HASH_INVALID", "sourceRecordHash must be SHA-256 hex.");
  }
  if (!Number.isFinite(Date.parse(governance.occurredAt))) {
    throw new HubSpotContractError("HUBSPOT_SYNC_OCCURRED_AT_INVALID", "occurredAt must be valid.");
  }
  if (governance.associationTargets.length !== 0) {
    throw new HubSpotContractError(
      "HUBSPOT_ASSOCIATIONS_NOT_IMPLEMENTED",
      "Associations are blocked until the HubSpot inventory defines exact association types."
    );
  }
  if (governance.approvedObjectType !== command.objectType) {
    throw new HubSpotContractError(
      "HUBSPOT_APPROVED_DESTINATION_MISMATCH",
      "The command object type does not match the approved destination."
    );
  }
  const payloadProperties = Object.keys(command.payload).sort();
  const approvedProperties = [...governance.approvedPropertyNames].sort();
  if (payloadProperties.length !== approvedProperties.length
      || payloadProperties.some((name, index) => name !== approvedProperties[index])) {
    throw new HubSpotContractError(
      "HUBSPOT_APPROVED_DESTINATION_MISMATCH",
      "The command properties do not match the approved destination allowlist."
    );
  }
  assertObjectReference(command.objectType, command.objectId);
}

function hubSpotPrimitive(value: unknown, propertyName: string): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  throw new HubSpotContractError(
    "HUBSPOT_PROPERTY_VALUE_INVALID",
    `HubSpot property ${propertyName} must be a JSON primitive.`
  );
}

function toProperties(payload: JsonObject): Record<string, string> {
  const entries = Object.entries(payload);
  if (entries.length < 1 || entries.length > 20) {
    throw new HubSpotContractError(
      "HUBSPOT_PROPERTY_SET_INVALID",
      "A governed write must contain between one and twenty properties."
    );
  }
  return Object.fromEntries(entries.map(([name, value]) => {
    if (!propertyPattern.test(name)) {
      throw new HubSpotContractError("HUBSPOT_PROPERTY_NAME_INVALID", `Invalid HubSpot property name ${name}.`);
    }
    return [name, hubSpotPrimitive(value, name)];
  }));
}

function normalizeProperties(properties: Record<string, unknown>, names: readonly string[]): JsonObject {
  return Object.fromEntries(names.map((name) => {
    const value = properties[name];
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return [name, value as JsonPrimitive];
    }
    return [name, value === undefined ? null : String(value)];
  }));
}

function retryAfterMs(headers: Headers): number | null {
  const value = headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

async function responseDetails(response: Response): Promise<JsonObject> {
  const text = (await response.text()).slice(0, 4096);
  let body: JsonPrimitive | JsonObject = text;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      body = {
        status: typeof record.status === "string" ? record.status : null,
        category: typeof record.category === "string" ? record.category : null,
        correlationId: typeof record.correlationId === "string" ? record.correlationId : null,
        message: typeof record.message === "string" ? record.message.slice(0, 1000) : null,
      };
    }
  } catch {
    body = text;
  }
  return {
    status: response.status,
    retryAfterMs: retryAfterMs(response.headers),
    body,
  };
}

export class HubSpotHttpAdapter implements HubSpotDataGateway {
  private readonly token: string;
  private readonly portalId: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: HubSpotFetch;
  private readonly now: () => Date;
  private readonly idempotency = new Map<string, IdempotencyRecord>();

  constructor(options: HubSpotHttpAdapterOptions) {
    this.token = required(options.privateAppToken, "HUBSPOT_PRIVATE_APP_TOKEN_REQUIRED");
    this.portalId = required(options.portalId, "HUBSPOT_PORTAL_ID_REQUIRED");
    this.baseUrl = safeApiBaseUrl(options.apiBaseUrl ?? "https://api.hubapi.com");
    this.timeoutMs = options.timeoutMs ?? 20_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1000 || this.timeoutMs > 120_000) {
      throw new HubSpotContractError(
        "HUBSPOT_ADAPTER_CONFIGURATION_INVALID",
        "HubSpot timeout must be an integer from 1000 to 120000 milliseconds."
      );
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async write<T extends JsonObject>(command: HubSpotWriteCommand<T>): Promise<HubSpotWriteReceipt> {
    assertGovernedCommand(command);
    const properties = toProperties(command.payload);
    const commandHash = hashJson({
      kind: command.kind,
      objectType: command.objectType,
      objectId: command.objectId,
      expectedVersion: command.expectedVersion ?? null,
      payload: command.payload,
      governance: command.governance,
    });
    const prior = this.idempotency.get(command.idempotencyKey);
    if (prior) {
      if (prior.commandHash !== commandHash) {
        throw new HubSpotContractError(
          "HUBSPOT_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key was already used with a different HubSpot command."
        );
      }
      return { ...prior.receipt, replayed: true };
    }

    if (command.expectedVersion !== undefined) {
      const current = await this.read<T>({
        objectType: command.objectType,
        objectId: command.objectId,
        properties: Object.keys(properties),
      });
      if (current.source.propertyOrPayloadVersion !== command.expectedVersion) {
        throw new HubSpotContractError(
          "HUBSPOT_VERSION_CONFLICT",
          "The HubSpot object changed after it was read.",
          {
            details: {
              expectedVersion: command.expectedVersion,
              currentVersion: current.source.propertyOrPayloadVersion,
            },
          }
        );
      }
    }

    const apiObject = await this.requestObject(
      "PATCH",
      command.objectType,
      command.objectId,
      Object.keys(properties),
      { properties }
    );
    const payload = normalizeProperties(apiObject.properties, Object.keys(properties));
    const receipt: HubSpotWriteReceipt = {
      portalId: this.portalId,
      objectType: command.objectType,
      objectId: apiObject.id,
      writeId: apiObject.objectWriteTraceId ?? `local:${command.idempotencyKey}`,
      acceptedAt: this.now().toISOString(),
      expectedPayloadHash: hashJson(payload),
      expectedVersion: apiObject.updatedAt,
      replayed: false,
      propertyNames: Object.keys(properties),
    };
    this.idempotency.set(command.idempotencyKey, { commandHash, receipt });
    return { ...receipt };
  }

  async readBack<T extends JsonObject>(receipt: HubSpotWriteReceipt): Promise<HubSpotSnapshot<T>> {
    if (!receipt.propertyNames?.length) {
      throw new HubSpotContractError(
        "HUBSPOT_READBACK_PROPERTIES_REQUIRED",
        "The real adapter requires the receipt property allowlist for readback."
      );
    }
    return this.read<T>({
      objectType: receipt.objectType,
      objectId: receipt.objectId,
      properties: receipt.propertyNames,
    });
  }

  async read<T extends JsonObject>(query: HubSpotSnapshotQuery): Promise<HubSpotSnapshot<T>> {
    assertObjectReference(query.objectType, query.objectId);
    const properties = query.properties ?? [];
    if (properties.length < 1 || properties.length > 20 || properties.some((name) => !propertyPattern.test(name))) {
      throw new HubSpotContractError(
        "HUBSPOT_READ_PROPERTIES_REQUIRED",
        "The real adapter requires an explicit allowlist of one to twenty properties."
      );
    }
    const object = await this.requestObject("GET", query.objectType, query.objectId, properties);
    const payload = normalizeProperties(object.properties, properties) as T;
    const retrievedAt = this.now().toISOString();
    return {
      source: {
        portalId: this.portalId,
        objectType: query.objectType,
        objectId: object.id,
        propertyOrPayloadVersion: object.updatedAt,
        hubspotUpdatedAt: object.updatedAt,
        retrievedAt,
        snapshotHash: hashJson(payload),
      },
      payload,
    };
  }

  private async requestObject(
    method: "GET" | "PATCH",
    objectType: string,
    objectId: string,
    properties: readonly string[],
    body?: JsonObject,
  ): Promise<HubSpotApiObject> {
    assertObjectReference(objectType, objectId);
    const url = new URL(
      `${this.baseUrl}/crm/v3/objects/${encodeURIComponent(objectType)}/${encodeURIComponent(objectId)}`
    );
    if (method === "GET") url.searchParams.set("properties", properties.join(","));

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new HubSpotContractError(
        "HUBSPOT_NETWORK_ERROR",
        "HubSpot request failed before a response was received.",
        {
          retryable: true,
          details: { cause: error instanceof Error ? error.name : "unknown" },
        }
      );
    }

    if (!response.ok) {
      const details = await responseDetails(response);
      throw new HubSpotContractError(
        transientStatuses.has(response.status) ? "HUBSPOT_TEMPORARY_FAILURE" : "HUBSPOT_REQUEST_REJECTED",
        `HubSpot returned HTTP ${response.status}.`,
        { retryable: transientStatuses.has(response.status), details }
      );
    }

    const value = await response.json().catch(() => null) as Partial<HubSpotApiObject> | null;
    if (!value || typeof value.id !== "string" || typeof value.updatedAt !== "string"
        || !value.properties || typeof value.properties !== "object" || Array.isArray(value.properties)) {
      throw new HubSpotContractError(
        "HUBSPOT_RESPONSE_INVALID",
        "HubSpot returned a response outside the expected CRM object contract.",
        { retryable: true }
      );
    }
    return value as HubSpotApiObject;
  }
}
