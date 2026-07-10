import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const M00_M12_EXPECTED = Object.freeze({
  firstVersion: '20260708220357',
  lastVersion: '20260709030140',
  migrationCount: 76,
  totalRemoteSqlBytes: 411340,
  combinedRemoteFingerprint:
    '663173105a16924db650127f437900de0ad3422b2f7bf50a5e804f19d1a570a3',
});

export const M13_EXPECTED = Object.freeze({
  firstVersion: '20260709051056',
  lastVersion: '20260709060330',
  migrationCount: 165,
  totalRemoteSqlBytes: 123636,
  combinedRemoteFingerprint:
    '6df68289eb6de6a47f84f6bb8dae0761c75f148132dd99341e739e8f4a62f144',
});

export const M14_EXPECTED = Object.freeze({
  firstVersion: '20260709183504',
  lastVersion: '20260709184749',
  migrationCount: 2,
  totalRemoteSqlBytes: 12045,
  combinedRemoteFingerprint:
    '8b3cb9b361f2bbff69d784ef92767de14795f761c1159321e8b163ccde96fde0',
});

export const M15_EXPECTED = Object.freeze({
  firstVersion: '20260710165530',
  lastVersion: '20260710165530',
  migrationCount: 1,
  totalRemoteSqlBytes: 1536,
  combinedRemoteFingerprint:
    '0fedbe5d3ca7d9e70b19e797269546c4183fe73a26a966cadeba70fb6bb866f8',
});

const EXPECTED_BY_FIRST_VERSION = new Map([
  [M00_M12_EXPECTED.firstVersion, M00_M12_EXPECTED],
  [M13_EXPECTED.firstVersion, M13_EXPECTED],
  [M14_EXPECTED.firstVersion, M14_EXPECTED],
  [M15_EXPECTED.firstVersion, M15_EXPECTED],
]);

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
    assert(!seenVersions.has(migration.version), `duplicate version ${migration.version}`);
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
      Number.isInteger(migration.remote_sql_bytes) && migration.remote_sql_bytes > 0,
      `invalid remote_sql_bytes: ${migration.file}`,
    );
    assert(
      /^[0-9a-f]{64}$/.test(migration.remote_sql_sha256),
      `invalid remote SQL hash: ${migration.file}`,
    );

    totalRemoteSqlBytes += migration.remote_sql_bytes;
  }

  return { totalRemoteSqlBytes };
}

function resolveExpected(manifest, explicitExpected) {
  if (explicitExpected) return explicitExpected;
  const expected = EXPECTED_BY_FIRST_VERSION.get(manifest.first_version);
  assert(expected, `no trusted inventory configured for ${manifest.first_version}`);
  return expected;
}

export async function validateRecoveredHistory(
  { manifestFile, migrationsDirectory, canonicalFile },
  explicitExpected,
) {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const expected = resolveExpected(manifest, explicitExpected);

  assert(manifest.schema_version === '1.0', 'unexpected manifest schema version');
  assert(
    manifest.artifact === 'e14_runtime_migration_recovery_manifest',
    'unexpected manifest artifact type',
  );
  assert(
    manifest.source === 'supabase_migrations.schema_migrations',
    'unexpected manifest source',
  );
  assert(manifest.first_version === expected.firstVersion, `unexpected first version ${manifest.first_version}`);
  assert(manifest.last_version === expected.lastVersion, `unexpected last version ${manifest.last_version}`);
  assert(manifest.migration_count === expected.migrationCount, `unexpected migration count ${manifest.migration_count}`);
  assert(
    Array.isArray(manifest.migrations) && manifest.migrations.length === expected.migrationCount,
    'manifest migration list is incomplete',
  );

  const versions = manifest.migrations.map((migration) => migration.version);
  assert(
    JSON.stringify(versions) === JSON.stringify([...versions].sort()),
    'manifest migrations are not ordered by version',
  );

  const { totalRemoteSqlBytes } = await validateMigrationFiles(manifest, migrationsDirectory);
  assert(totalRemoteSqlBytes === expected.totalRemoteSqlBytes, `unexpected remote SQL byte total ${totalRemoteSqlBytes}`);
  assert(
    manifest.total_remote_sql_bytes === expected.totalRemoteSqlBytes,
    `manifest remote SQL byte total differs: ${manifest.total_remote_sql_bytes}`,
  );

  const fingerprintInput = manifest.migrations
    .map((migration) => `${migration.version}:${migration.remote_sql_sha256}`)
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
