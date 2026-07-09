import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryIdentityProvider,
  InMemoryObjectStorageProvider,
  InMemoryQueueProvider,
  assertNormalizedIdentity,
} from './provider-contracts.mjs';

test('identity provider returns normalized identity without raw tokens', async () => {
  const provider = new InMemoryIdentityProvider(new Map([
    ['valid', { provider: 'test', subject: 'subject-1', emailVerified: true, claims: { role: 'learner' } }],
  ]));
  const identity = await provider.verifyAccessToken('valid');
  assertNormalizedIdentity(identity);
  assert.equal(identity.subject, 'subject-1');
});

test('identity provider rejects invalid token', async () => {
  const provider = new InMemoryIdentityProvider();
  await assert.rejects(() => provider.verifyAccessToken('bad'), /invalid_token/);
});

test('storage contract creates intent and confirms metadata only', async () => {
  const storage = new InMemoryObjectStorageProvider();
  const intent = await storage.createUploadIntent({
    objectId: 'obj-1', contentType: 'application/pdf', maxBytes: 10_000,
  });
  assert.match(intent.uploadUrl, /^memory:\/\/upload\//);
  const confirmed = await storage.confirmUpload({
    objectId: 'obj-1', sha256: 'abc123', sizeBytes: 123, contentType: 'application/pdf',
  });
  assert.equal(confirmed.status, 'confirmed');
});

test('queue contract deduplicates publish, hides in-flight messages and acknowledges idempotently', async () => {
  let now = Date.parse('2026-07-08T12:00:00Z');
  const queue = new InMemoryQueueProvider({ clock: () => now });
  const input = {
    queueCode: 'file_scan',
    jobType: 'file.malware_scan.requested',
    deduplicationKey: 'file:1:hash',
    payload: { fileObjectId: '1' },
  };
  const first = await queue.publish(input);
  const duplicate = await queue.publish(input);
  assert.equal(first.accepted, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.jobId, first.jobId);

  const [delivery] = await queue.receive({
    queueCode: 'file_scan', workerId: 'worker-a', maxMessages: 1, visibilityTimeoutSeconds: 60,
  });
  assert.equal(delivery.receiveCount, 1);
  assert.deepEqual(await queue.receive({ queueCode: 'file_scan', workerId: 'worker-b' }), []);

  await queue.extendVisibility({
    receiptHandle: delivery.receiptHandle, workerId: 'worker-a', visibilityTimeoutSeconds: 120,
  });
  now += 61_000;
  assert.deepEqual(await queue.receive({ queueCode: 'file_scan', workerId: 'worker-b' }), []);
  assert.equal(await queue.acknowledge({ receiptHandle: delivery.receiptHandle, workerId: 'worker-a' }), true);
  assert.equal(await queue.acknowledge({ receiptHandle: delivery.receiptHandle, workerId: 'worker-a' }), true);
});

test('queue retry produces a new receipt and increments receive count', async () => {
  let now = Date.parse('2026-07-08T12:00:00Z');
  const queue = new InMemoryQueueProvider({ clock: () => now });
  await queue.publish({ queueCode: 'file_scan', jobType: 'scan', deduplicationKey: 'retry', payload: {} });
  const [first] = await queue.receive({ queueCode: 'file_scan', workerId: 'worker-a' });
  assert.deepEqual(await queue.retry({ receiptHandle: first.receiptHandle, workerId: 'worker-a', delaySeconds: 10 }), {
    status: 'retry_scheduled',
  });
  assert.deepEqual(await queue.receive({ queueCode: 'file_scan', workerId: 'worker-b' }), []);
  now += 10_000;
  const [second] = await queue.receive({ queueCode: 'file_scan', workerId: 'worker-b' });
  assert.notEqual(second.receiptHandle, first.receiptHandle);
  assert.equal(second.receiveCount, 2);
});

test('queue moves exhausted jobs to the dead-letter collection', async () => {
  const queue = new InMemoryQueueProvider({ maxReceiveCount: 1 });
  await queue.publish({ queueCode: 'file_scan', jobType: 'scan', deduplicationKey: 'dlq', payload: {} });
  const [delivery] = await queue.receive({ queueCode: 'file_scan', workerId: 'worker-a' });
  assert.deepEqual(await queue.retry({ receiptHandle: delivery.receiptHandle, workerId: 'worker-a' }), {
    status: 'dead_lettered',
  });
  assert.equal(queue.deadLetters.length, 1);
  assert.equal(queue.deadLetters[0].reasonCode, 'max_receive_count_exceeded');
});
