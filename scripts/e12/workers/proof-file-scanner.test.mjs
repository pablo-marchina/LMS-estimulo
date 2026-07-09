import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { EICAR_SIGNATURE, scanProofBytes } from './proof-file-scanner.mjs';

function input(text, overrides = {}) {
  const bytes = Buffer.from(text);
  return {
    bytes,
    contentType: 'text/plain',
    expectedSizeBytes: bytes.length,
    expectedSha256: createHash('sha256').update(bytes).digest('hex'),
    ...overrides,
  };
}

test('marks clean text as clean after integrity checks', () => {
  assert.equal(scanProofBytes(input('safe proof')).scanStatus, 'clean');
});

test('detects the EICAR test signature', () => {
  const result = scanProofBytes(input(EICAR_SIGNATURE));
  assert.equal(result.scanStatus, 'infected');
  assert.equal(result.threats[0].name, 'EICAR-Test-File');
});

test('returns unsupported for non-text content', () => {
  assert.equal(scanProofBytes(input('bytes', { contentType: 'application/pdf' })).scanStatus, 'unsupported');
});

test('rejects size mismatch', () => {
  assert.throws(() => scanProofBytes(input('safe proof', { expectedSizeBytes: 1 })), /file_size_mismatch/);
});

test('rejects hash mismatch', () => {
  assert.throws(() => scanProofBytes(input('safe proof', { expectedSha256: '0'.repeat(64) })), /file_hash_mismatch/);
});
