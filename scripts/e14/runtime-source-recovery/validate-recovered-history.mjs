import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const E14_M13_EXPECTED = Object.freeze({
  firstVersion: '20260709051056',
  lastVersion: '20260709060330',
  migrationCount: 165,
  totalRemoteSqlBytes: 123636,
  combinedRemoteFingerprint:
    '6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144',
});

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid CLI argument near ${key ?? '<end>'}`);
    }
    values.set(key.slice(2), value);
  }

  for (const required of ['manifest', 'migrations-dir', 'canonical-file']) {
    if (!values.has(required)) throw new Error(`missing --${required}`);
  }

  return {
    manifestFile: values.get('manifest'),
    migrationsDirectory: values.get('migrations-dir'),
    canonicalFile: values.get('canonical-file'),
  };
}

async function validateMigrationFiles(manifest, migrationsDirectory) {
  const seenVersions = new Set();
  let totalRemoteSqlBytes = 0;

  for (const migration of manifest.migrations) {
    assert(/^\d{14}$/.test(migration.version), `invalid version ${migration.version}`);
    assert(
      !seenVersions.has(migration.version),
      `duplicate version ${migration.version}`,
    );
    seenVersions.add(migration.version);

    const expectedFile = `${migration.version}_${migration.name}.sql`;
    assert(
      migration.file === expectedFile,
      `unexpected filename for ${migration.version}: ${migration.file}`,
    );

    const filePath = path.join(migrationsDirectory, migration.file);
    const content = await readFile(filePath);
    assert(
      sha256(content) === migration.materialized_file_sha256,
      `materialized file hash mismatch: ${migration.file}`,
    );

    assert(
      Number.isInteger(migration.remote_sql_bytes) &&
        migration.remote_sql_bytes > 0,
      `invalid remote_sql_bytes: ${migration.file}`,
    );
    assert(
      /^[0-9a-f]{64}$/.test(migration.remote_sql_sha256),
      `invalid remote SQL hash: ${migration.file}`,
    );

    totalRemoteSqlBytes += migration.remote_sql_bytes;
  }

  return { seenVersions, totalRemoteSqlBytes };
}

export async function validateRecoveredHistory(
  { manifestFile, migrationsDirectory, canonicalFile },
  expected = E14_M13_EXPECTED,
) {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));

  assert(manifest.schema_version === '1.0', 'unexpected manifest schema version');
  assert(
    manifest.artifact === 'e14_runtime_migration_recovery_manifest',
    'unexpected manifest artifact type',
  );
  assert(
    manifest.first_version === expected.firstVersion,
    `unexpected first version ${manifest.first_version}`,
  );
  assert(
    manifest.last_version === expected.lastVersion,
    `unexpected last version ${manifest.last_version}`,
  );
  assert(
    manifest.migration_count === expected.migrationCount,
    `unexpected migration count ${manifest.migration_count}`,
  );
  assert(
    Array.isArray(manifest.migrations) &&
      manifest.migrations.length === expected.migrationCount,
    'manifest migration list is incomplete',
  );

  const versions = manifest.migrations.map((migration) => migration.version);
  const sortedVersions = [...versions].sort();
  assert(
    JSON.stringify(versions) === JSON.stringify(sortedVersions),
    'manifest migrations are not ordered by version',
  );

  const { totalRemoteSqlBytes } = await validateMigrationFiles(
    manifest,
    migrationsDirectory,
  );
  assert(
    totalRemoteSqlBytes === expected.totalRemoteSqlBytes,
    `unexpected remote SQL byte total ${totalRemoteSqlBytes}`,
  );
  assert(
    manifest.total_remote_sql_bytes === expected.totalRemoteSqlBytes,
    `manifest remote SQL byte total differs: ${manifest.total_remote_sql_bytes}`,
  );

  const fingerprintInput = manifest.migrations
    .map(
      (migration) => `${migration.version}:${migration.remote_sql_sha256}`,
    )
    .join('\n');
  const fingerprint = sha256(fingerprintInput);
  assert(
    fingerprint === expected.combinedRemoteFingerprint,
    `unexpected combined remote fingerprint ${fingerprint}`,
  );
  assert(
    manifest.combined_remote_fingerprint_sha256 === fingerprint,
    'manifest combined fingerprint differs from recomputed value',
  );

  const canonicalContent = await readFile(canonicalFile);
  assert(
    sha256(canonicalContent) === manifest.canonical_file_sha256,
    'canonical file hash differs from manifest',
  );
  assert(
    path.basename(canonicalFile) === manifest.canonical_file,
    'canonical filename differs from manifest',
  );

  return {
    status: 'valid',
    first_version: manifest.first_version,
    last_version: manifest.last_version,
    migration_count: manifest.migration_count,
    total_remote_sql_bytes: manifest.total_remote_sql_bytes,
    combined_remote_fingerprint_sha256: fingerprint,
    canonical_file_sha256: manifest.canonical_file_sha256,
  };
}

async function main() {
  const result = await validateRecoveredHistory(parseArguments(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
