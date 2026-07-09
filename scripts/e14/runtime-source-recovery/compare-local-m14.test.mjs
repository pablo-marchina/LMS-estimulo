import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const EXPECTED = [
  {
    localFile:
      'supabase/migrations/20260709183000_m14_step5_application_read_surfaces.sql',
    remoteVersion: '20260709183504',
    remoteName: 'm14_step5_application_read_surfaces',
    remoteBytes: 10164,
    remoteSha256:
      '464263feab785f9ae35d95ad89c215e9794f473e89f5d7d36a0f1c371d1c328d',
  },
  {
    localFile:
      'supabase/migrations/20260709184500_m14b_step5_operator_workspace.sql',
    remoteVersion: '20260709184749',
    remoteName: 'm14b_step5_operator_workspace',
    remoteBytes: 1881,
    remoteSha256:
      '9b4b9b387778ee174c01aaf700d638e6df157065a167c585624e8a1ad3e1fe69',
  },
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

for (const expected of EXPECTED) {
  test(`${expected.remoteVersion}_${expected.remoteName} matches remote SQL`, async () => {
    const content = await readFile(expected.localFile);

    assert.equal(
      content.byteLength,
      expected.remoteBytes,
      `${expected.localFile} byte length differs from the remote statement`,
    );
    assert.equal(
      sha256(content),
      expected.remoteSha256,
      `${expected.localFile} SHA-256 differs from the remote statement`,
    );
  });
}
