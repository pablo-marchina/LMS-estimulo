import type { HubSpotDataGateway } from "./gateway.js";
import {
  HubSpotContractError,
  type HubSpotSnapshot,
  type HubSpotSnapshotQuery,
  type HubSpotWriteCommand,
  type HubSpotWriteReceipt,
  type JsonObject
} from "./contracts.js";
import { hashJson } from "./hashing.js";

export type HubSpotFaultOperation = "write" | "readBack" | "read";

export type HubSpotPlannedFault = {
  operation: HubSpotFaultOperation;
  code: string;
  message: string;
  retryable: boolean;
  occurrences?: number;
  status?: number;
};

type StoredRecord = {
  payload: JsonObject;
  version: number;
  updatedAt: string;
  snapshotHash: string;
  lastWriteId: string;
};

type StoredIdempotency = {
  commandHash: string;
  receipt: HubSpotWriteReceipt;
};

type MutableFault = HubSpotPlannedFault & { remaining: number };

export type InMemoryHubSpotAdapterOptions = {
  portalId?: string;
  now?: () => Date;
  readBackVisibilityDelay?: number;
};

export type InMemoryHubSpotMetrics = {
  attempts: Record<HubSpotFaultOperation, number>;
  committedWrites: number;
  storedObjects: number;
};

function objectKey(objectType: string, objectId: string): string {
  return `${objectType}\u0000${objectId}`;
}

function cloneJson<T extends JsonObject>(value: T): T {
  return structuredClone(value);
}

export class InMemoryHubSpotAdapter implements HubSpotDataGateway {
  private readonly portalId: string;
  private readonly now: () => Date;
  private readonly readBackVisibilityDelay: number;
  private readonly records = new Map<string, StoredRecord>();
  private readonly idempotency = new Map<string, StoredIdempotency>();
  private readonly pendingVisibility = new Map<string, number>();
  private readonly faults: MutableFault[] = [];
  private readonly attempts: Record<HubSpotFaultOperation, number> = {
    write: 0,
    readBack: 0,
    read: 0
  };
  private objectSequence = 0;
  private writeSequence = 0;
  private committedWrites = 0;

  constructor(options: InMemoryHubSpotAdapterOptions = {}) {
    this.portalId = options.portalId ?? "test-portal";
    this.now = options.now ?? (() => new Date());
    this.readBackVisibilityDelay = options.readBackVisibilityDelay ?? 0;

    if (!Number.isInteger(this.readBackVisibilityDelay) || this.readBackVisibilityDelay < 0) {
      throw new HubSpotContractError(
        "HUBSPOT_ADAPTER_CONFIGURATION_INVALID",
        "readBackVisibilityDelay must be a non-negative integer."
      );
    }
  }

  planFault(fault: HubSpotPlannedFault): void {
    const remaining = fault.occurrences ?? 1;
    if (!Number.isInteger(remaining) || remaining <= 0) {
      throw new HubSpotContractError(
        "HUBSPOT_ADAPTER_CONFIGURATION_INVALID",
        "Fault occurrences must be a positive integer."
      );
    }
    this.faults.push({ ...fault, remaining });
  }

  metrics(): InMemoryHubSpotMetrics {
    return {
      attempts: { ...this.attempts },
      committedWrites: this.committedWrites,
      storedObjects: this.records.size
    };
  }

  async write<T extends JsonObject>(command: HubSpotWriteCommand<T>): Promise<HubSpotWriteReceipt> {
    this.attempts.write += 1;
    this.consumeFault("write");

    const commandHash = hashJson({
      kind: command.kind,
      objectType: command.objectType,
      objectId: command.objectId ?? null,
      expectedVersion: command.expectedVersion ?? null,
      payload: command.payload
    });

    const prior = this.idempotency.get(command.idempotencyKey);
    if (prior) {
      if (prior.commandHash !== commandHash) {
        throw new HubSpotContractError(
          "HUBSPOT_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key was already used with a different command."
        );
      }
      return { ...prior.receipt, replayed: true };
    }

    const objectId = command.objectId ?? `${command.objectType}-${++this.objectSequence}`;
    const key = objectKey(command.objectType, objectId);
    const existing = this.records.get(key);
    const currentVersion = existing?.version ?? 0;

    if (command.expectedVersion !== undefined && command.expectedVersion !== String(currentVersion)) {
      throw new HubSpotContractError(
        "HUBSPOT_VERSION_CONFLICT",
        "The HubSpot object changed after it was read.",
        {
          details: {
            expectedVersion: command.expectedVersion,
            currentVersion: String(currentVersion)
          }
        }
      );
    }

    const version = currentVersion + 1;
    const acceptedAt = this.now().toISOString();
    const writeId = `write-${++this.writeSequence}`;
    const expectedPayloadHash = hashJson(command.payload);
    const receipt: HubSpotWriteReceipt = {
      portalId: this.portalId,
      objectType: command.objectType,
      objectId,
      writeId,
      acceptedAt,
      expectedPayloadHash,
      expectedVersion: String(version),
      replayed: false
    };

    this.records.set(key, {
      payload: cloneJson(command.payload),
      version,
      updatedAt: acceptedAt,
      snapshotHash: expectedPayloadHash,
      lastWriteId: writeId
    });
    this.pendingVisibility.set(writeId, this.readBackVisibilityDelay);
    this.idempotency.set(command.idempotencyKey, { commandHash, receipt });
    this.committedWrites += 1;

    return { ...receipt };
  }

  async readBack<T extends JsonObject>(receipt: HubSpotWriteReceipt): Promise<HubSpotSnapshot<T>> {
    this.attempts.readBack += 1;
    this.consumeFault("readBack");

    const remaining = this.pendingVisibility.get(receipt.writeId) ?? 0;
    if (remaining > 0) {
      this.pendingVisibility.set(receipt.writeId, remaining - 1);
      throw new HubSpotContractError(
        "HUBSPOT_READBACK_NOT_VISIBLE",
        "The HubSpot write is not visible to readback yet.",
        { retryable: true }
      );
    }

    const record = this.records.get(objectKey(receipt.objectType, receipt.objectId));
    if (!record) {
      throw new HubSpotContractError(
        "HUBSPOT_OBJECT_NOT_FOUND",
        "The object accepted by HubSpot could not be read back.",
        { retryable: true }
      );
    }

    if (record.lastWriteId !== receipt.writeId) {
      throw new HubSpotContractError(
        "HUBSPOT_READBACK_SUPERSEDED",
        "The object was changed before the accepted write could be confirmed."
      );
    }

    return this.toSnapshot<T>(receipt.objectType, receipt.objectId, record);
  }

  async read<T extends JsonObject>(query: HubSpotSnapshotQuery): Promise<HubSpotSnapshot<T>> {
    this.attempts.read += 1;
    this.consumeFault("read");

    const record = this.records.get(objectKey(query.objectType, query.objectId));
    if (!record) {
      throw new HubSpotContractError(
        "HUBSPOT_OBJECT_NOT_FOUND",
        "The requested HubSpot object does not exist."
      );
    }

    return this.toSnapshot<T>(query.objectType, query.objectId, record);
  }

  mutateExternally<T extends JsonObject>(query: HubSpotSnapshotQuery, payload: T): void {
    const key = objectKey(query.objectType, query.objectId);
    const existing = this.records.get(key);
    if (!existing) {
      throw new HubSpotContractError(
        "HUBSPOT_OBJECT_NOT_FOUND",
        "The requested HubSpot object does not exist."
      );
    }

    const updatedAt = this.now().toISOString();
    this.records.set(key, {
      payload: cloneJson(payload),
      version: existing.version + 1,
      updatedAt,
      snapshotHash: hashJson(payload),
      lastWriteId: `external-${++this.writeSequence}`
    });
  }

  private toSnapshot<T extends JsonObject>(
    objectType: string,
    objectId: string,
    record: StoredRecord
  ): HubSpotSnapshot<T> {
    return {
      source: {
        portalId: this.portalId,
        objectType,
        objectId,
        propertyOrPayloadVersion: String(record.version),
        hubspotUpdatedAt: record.updatedAt,
        retrievedAt: this.now().toISOString(),
        snapshotHash: record.snapshotHash
      },
      payload: cloneJson(record.payload) as T
    };
  }

  private consumeFault(operation: HubSpotFaultOperation): void {
    const fault = this.faults.find((candidate) => candidate.operation === operation && candidate.remaining > 0);
    if (!fault) return;

    fault.remaining -= 1;
    throw new HubSpotContractError(fault.code, fault.message, {
      retryable: fault.retryable,
      details: fault.status === undefined ? undefined : { status: fault.status }
    });
  }
}
