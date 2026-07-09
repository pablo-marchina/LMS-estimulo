import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export class IdentityProvider {
  async verifyAccessToken(_token) { throw new Error('Not implemented'); }
}

export class ObjectStorageProvider {
  async createUploadIntent(_input) { throw new Error('Not implemented'); }
  async confirmUpload(_input) { throw new Error('Not implemented'); }
}

export class QueueProvider {
  async publish(_input) { throw new Error('Not implemented'); }
  async receive(_input) { throw new Error('Not implemented'); }
  async extendVisibility(_input) { throw new Error('Not implemented'); }
  async acknowledge(_input) { throw new Error('Not implemented'); }
  async retry(_input) { throw new Error('Not implemented'); }
  async deadLetter(_input) { throw new Error('Not implemented'); }
}

export class InMemoryIdentityProvider extends IdentityProvider {
  constructor(tokens = new Map()) {
    super();
    this.tokens = tokens;
  }
  async verifyAccessToken(token) {
    const result = this.tokens.get(token);
    if (!result) throw new Error('invalid_token');
    return structuredClone(result);
  }
}

export class InMemoryObjectStorageProvider extends ObjectStorageProvider {
  constructor() {
    super();
    this.objects = new Map();
  }
  async createUploadIntent({ objectId, contentType, maxBytes }) {
    assert.ok(objectId);
    assert.ok(contentType);
    assert.ok(maxBytes > 0);
    return {
      objectId,
      uploadUrl: `memory://upload/${objectId}`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      requiredHeaders: { 'content-type': contentType },
      maxBytes,
    };
  }
  async confirmUpload({ objectId, sha256, sizeBytes, contentType }) {
    assert.ok(objectId && sha256 && sizeBytes >= 0 && contentType);
    const stored = { objectId, sha256, sizeBytes, contentType, status: 'confirmed' };
    this.objects.set(objectId, stored);
    return structuredClone(stored);
  }
}

export class InMemoryQueueProvider extends QueueProvider {
  constructor({ clock = () => Date.now(), maxReceiveCount = 5 } = {}) {
    super();
    this.clock = clock;
    this.maxReceiveCount = maxReceiveCount;
    this.jobsByDeduplicationKey = new Map();
    this.messages = [];
    this.receipts = new Map();
    this.deadLetters = [];
  }

  async publish({ queueCode, jobType, jobVersion = 1, deduplicationKey, payload, delaySeconds = 0 }) {
    assert.ok(queueCode && jobType && deduplicationKey);
    const existing = this.jobsByDeduplicationKey.get(`${queueCode}:${deduplicationKey}`);
    if (existing) return { accepted: false, duplicate: true, jobId: existing.jobId };

    const jobId = randomUUID();
    const now = this.clock();
    const message = {
      jobId,
      queueCode,
      jobType,
      jobVersion,
      deduplicationKey,
      payload: structuredClone(payload ?? {}),
      visibleAt: now + delaySeconds * 1000,
      receiveCount: 0,
      status: 'queued',
    };
    this.jobsByDeduplicationKey.set(`${queueCode}:${deduplicationKey}`, message);
    this.messages.push(message);
    return { accepted: true, duplicate: false, jobId };
  }

  async receive({ queueCode, workerId, maxMessages = 1, visibilityTimeoutSeconds = 30 }) {
    const now = this.clock();
    const deliveries = [];
    for (const message of this.messages) {
      if (deliveries.length >= maxMessages) break;
      if (message.queueCode !== queueCode || message.visibleAt > now || message.status === 'completed') continue;
      message.receiveCount += 1;
      if (message.receiveCount > this.maxReceiveCount) {
        message.status = 'dead_lettered';
        this.deadLetters.push(structuredClone(message));
        continue;
      }
      const receiptHandle = randomUUID();
      message.visibleAt = now + visibilityTimeoutSeconds * 1000;
      message.status = 'in_flight';
      this.receipts.set(receiptHandle, { message, workerId, status: 'in_flight' });
      deliveries.push({
        receiptHandle,
        jobId: message.jobId,
        jobType: message.jobType,
        jobVersion: message.jobVersion,
        receiveCount: message.receiveCount,
        visibilityDeadline: new Date(message.visibleAt).toISOString(),
        payload: structuredClone(message.payload),
      });
    }
    return deliveries;
  }

  #activeReceipt(receiptHandle, workerId) {
    const receipt = this.receipts.get(receiptHandle);
    if (!receipt || receipt.workerId !== workerId || receipt.status !== 'in_flight') {
      throw new Error('receipt_not_owned_or_inactive');
    }
    return receipt;
  }

  async extendVisibility({ receiptHandle, workerId, visibilityTimeoutSeconds }) {
    const receipt = this.#activeReceipt(receiptHandle, workerId);
    receipt.message.visibleAt = this.clock() + visibilityTimeoutSeconds * 1000;
    return { visibilityDeadline: new Date(receipt.message.visibleAt).toISOString() };
  }

  async acknowledge({ receiptHandle, workerId }) {
    const receipt = this.receipts.get(receiptHandle);
    if (!receipt || receipt.workerId !== workerId) return false;
    if (receipt.status === 'acked') return true;
    if (receipt.status !== 'in_flight') return false;
    receipt.status = 'acked';
    receipt.message.status = 'completed';
    this.messages = this.messages.filter((message) => message !== receipt.message);
    return true;
  }

  async retry({ receiptHandle, workerId, delaySeconds = 0 }) {
    const receipt = this.#activeReceipt(receiptHandle, workerId);
    if (receipt.message.receiveCount >= this.maxReceiveCount) {
      await this.deadLetter({ receiptHandle, workerId, reasonCode: 'max_receive_count_exceeded' });
      return { status: 'dead_lettered' };
    }
    receipt.status = 'released';
    receipt.message.status = 'retry_scheduled';
    receipt.message.visibleAt = this.clock() + delaySeconds * 1000;
    return { status: 'retry_scheduled' };
  }

  async deadLetter({ receiptHandle, workerId, reasonCode }) {
    const receipt = this.#activeReceipt(receiptHandle, workerId);
    receipt.status = 'dead_lettered';
    receipt.message.status = 'dead_lettered';
    this.messages = this.messages.filter((message) => message !== receipt.message);
    this.deadLetters.push({ ...structuredClone(receipt.message), reasonCode });
    return { status: 'dead_lettered', jobId: receipt.message.jobId };
  }
}

export function assertNormalizedIdentity(identity) {
  assert.equal(typeof identity.provider, 'string');
  assert.equal(typeof identity.subject, 'string');
  assert.ok(identity.provider.length > 0);
  assert.ok(identity.subject.length > 0);
  assert.equal(typeof identity.emailVerified, 'boolean');
  assert.ok(!('accessToken' in identity));
  assert.ok(!('refreshToken' in identity));
}
