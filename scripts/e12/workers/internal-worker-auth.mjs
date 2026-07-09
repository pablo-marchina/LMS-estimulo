import { createHmac, timingSafeEqual } from 'node:crypto';

export function signInternalWorkerRequest(secret, timestamp, rawBody) {
  if (!secret) throw new Error('internal_auth_secret_required');
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function verifyInternalWorkerRequest(secret, {
  timestamp,
  signature,
  rawBody,
  nowSeconds = Math.floor(Date.now() / 1000),
  allowedClockSkewSeconds = 60,
}) {
  const numericTimestamp = Number(timestamp);
  if (!Number.isInteger(numericTimestamp)) throw new Error('internal_auth_timestamp_required');
  if (Math.abs(nowSeconds - numericTimestamp) > allowedClockSkewSeconds) {
    throw new Error('internal_auth_timestamp_expired');
  }
  if (!/^[a-f0-9]{64}$/i.test(signature ?? '')) {
    throw new Error('internal_auth_signature_required');
  }
  const expected = signInternalWorkerRequest(secret, String(timestamp), rawBody);
  const actualBuffer = Buffer.from(String(signature).toLowerCase(), 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('internal_auth_signature_invalid');
  }
  return true;
}
