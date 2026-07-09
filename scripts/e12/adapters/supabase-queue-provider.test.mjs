import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseQueueProvider } from './supabase-queue-provider.mjs';

function mockClient(responses) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args });
      const response = responses[name];
      return typeof response === 'function' ? response(args) : response;
    },
  };
}

test('Supabase queue adapter publishes provider-neutral jobs', async () => {
  const client = mockClient({ queue_enqueue_job: { data: 'job-1', error: null } });
  const queue = new SupabaseQueueProvider({ client, queueCode: 'file_scan', workerId: 'worker-a' });
  assert.deepEqual(await queue.publish({
    jobType: 'file.malware_scan.requested',
    deduplicationKey: 'file:1:hash',
    subjectType: 'file_object',
    subjectId: 'file-1',
    payload: { fileObjectId: 'file-1' },
  }), { jobId: 'job-1' });
  assert.equal(client.calls[0].name, 'queue_enqueue_job');
  assert.equal(client.calls[0].args.p_queue_code, 'file_scan');
  assert.equal(client.calls[0].args.p_deduplication_key, 'file:1:hash');
});

test('Supabase queue adapter normalizes delivery and lifecycle calls', async () => {
  const client = mockClient({
    queue_receive_jobs: {
      data: [{
        receipt_handle: 'receipt-1', job_id: 'job-1', job_type: 'scan', job_version: 1,
        receive_count: 2, visibility_deadline: '2026-07-08T12:01:00Z',
        enqueued_at: '2026-07-08T12:00:00Z', payload: { fileObjectId: 'file-1' }, message_headers: {},
      }],
      error: null,
    },
    queue_extend_visibility: { data: '2026-07-08T12:02:00Z', error: null },
    queue_retry_job: { data: 'retry_scheduled', error: null },
    queue_ack_job: { data: true, error: null },
    queue_dead_letter_job: { data: 'dlq-1', error: null },
    queue_redrive_dead_letter: { data: 'job-1', error: null },
    queue_get_metrics: { data: [{ queue_code: 'file_scan', visible_or_in_flight_messages: 0 }], error: null },
  });
  const queue = new SupabaseQueueProvider({ client, queueCode: 'file_scan', workerId: 'worker-a' });
  const [delivery] = await queue.receive({ maxMessages: 1, visibilityTimeoutSeconds: 60 });
  assert.equal(delivery.receiptHandle, 'receipt-1');
  assert.equal(delivery.receiveCount, 2);
  assert.deepEqual(await queue.extendVisibility({ receiptHandle: 'receipt-1', visibilityTimeoutSeconds: 120 }), {
    visibilityDeadline: '2026-07-08T12:02:00Z',
  });
  assert.deepEqual(await queue.retry({ receiptHandle: 'receipt-1', errorCode: 'temporary', delaySeconds: 15 }), {
    status: 'retry_scheduled',
  });
  assert.equal(await queue.acknowledge({ receiptHandle: 'receipt-1' }), true);
  assert.deepEqual(await queue.deadLetter({ receiptHandle: 'receipt-1', reasonCode: 'bad_payload' }), {
    deadLetterId: 'dlq-1',
  });
  assert.deepEqual(await queue.redrive({ deadLetterId: 'dlq-1', reason: 'fixed' }), { jobId: 'job-1' });
  assert.equal((await queue.metrics()).queue_code, 'file_scan');
});

test('Supabase queue adapter surfaces RPC errors', async () => {
  const client = mockClient({ queue_receive_jobs: { data: null, error: { message: 'denied' } } });
  const queue = new SupabaseQueueProvider({ client, queueCode: 'file_scan', workerId: 'worker-a' });
  await assert.rejects(() => queue.receive(), /queue_receive_jobs_failed:denied/);
});
