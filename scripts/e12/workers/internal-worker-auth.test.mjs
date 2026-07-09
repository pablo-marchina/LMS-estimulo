import assert from 'node:assert/strict';
import test from 'node:test';
import { signInternalWorkerRequest, verifyInternalWorkerRequest } from './internal-worker-auth.mjs';

const secret = 'not-a-real-secret';
const timestamp = 1783552600;
const body = JSON.stringify({ maxMessages: 1 });

test('accepts a valid signed request', () => {
  const signature = signInternalWorkerRequest(secret, timestamp, body);
  assert.equal(verifyInternalWorkerRequest(secret, { timestamp, signature, rawBody: body, nowSeconds: timestamp }), true);
});

test('rejects a modified body', () => {
  const signature = signInternalWorkerRequest(secret, timestamp, body);
  assert.throws(() => verifyInternalWorkerRequest(secret, {
    timestamp,
    signature,
    rawBody: JSON.stringify({ maxMessages: 10 }),
    nowSeconds: timestamp,
  }), /internal_auth_signature_invalid/);
});

test('rejects an expired timestamp', () => {
  const signature = signInternalWorkerRequest(secret, timestamp, body);
  assert.throws(() => verifyInternalWorkerRequest(secret, {
    timestamp,
    signature,
    rawBody: body,
    nowSeconds: timestamp + 61,
  }), /internal_auth_timestamp_expired/);
});

test('rejects malformed signatures', () => {
  assert.throws(() => verifyInternalWorkerRequest(secret, {
    timestamp,
    signature: 'invalid',
    rawBody: body,
    nowSeconds: timestamp,
  }), /internal_auth_signature_required/);
});
