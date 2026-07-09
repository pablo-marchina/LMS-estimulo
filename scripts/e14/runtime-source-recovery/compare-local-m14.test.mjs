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

function candidateRepresentations(rawContent) {
  const raw = rawContent;
  const utf8 = raw.toString('utf8');
  const withoutBom = utf8.replace(/^\uFEFF/, '');
  const lfNormalized = withoutBom.replace(/\r\n/g, '\n');
  const withoutFinalLf = lfNormalized.endsWith('\n')
    ? lfNormalized.slice(0, -1)
    : lfNormalized;

  const candidates = [
    { normalization: 'none', content: raw },
    { normalization: 'utf8_bom_removed', content: Buffer.from(withoutBom, 'utf8') },
    {
      normalization: 'line_endings_normalized',
      content: Buffer.from(lfNormalized, 'utf8'),
    },
    {
      normalization: 'line_endings_and_final_lf_normalized',
      content: Buffer.from(withoutFinalLf, 'utf8'),
    },
  ];

  const unique = new Map();
  for (const candidate of candidates) {
    const fingerprint = `${candidate.content.byteLength}:${sha256(candidate.content)}`;
    if (!unique.has(fingerprint)) unique.set(fingerprint, candidate);
  }
  return [...unique.values()];
}

for (const expected of EXPECTED) {
  test(`${expected.remoteVersion}_${expected.remoteName} matches remote SQL`, async () => {
    const rawContent = await readFile(expected.localFile);
    const candidates = candidateRepresentations(rawContent);
    const match = candidates.find(
      (candidate) =>
        candidate.content.byteLength === expected.remoteBytes &&
        sha256(candidate.content) === expected.remoteSha256,
    );

    assert.ok(
      match,
      [
        `${expected.localFile} contains SQL that differs from the remote statement`,
        `remote=${expected.remoteBytes}:${expected.remoteSha256}`,
        `local_candidates=${candidates
          .map(
            (candidate) =>
              `${candidate.normalization}:${candidate.content.byteLength}:${sha256(
                candidate.content,
              )}`,
          )
          .join(',')}`,
      ].join(' | '),
    );

    process.stdout.write(
      `${JSON.stringify({
        local_file: expected.localFile,
        remote_version: expected.remoteVersion,
        equivalence: 'verified',
        normalization: match.normalization,
      })}\n`,
    );
  });
}
