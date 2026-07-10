import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  E14_M13_EXPECTED,
  E14_M14_EXPECTED,
  E14_M15_EXPECTED,
  validateRecoveredHistory,
} from './validate-recovered-history.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function createFixture(root) {
  const migrationsDirectory = path.join(root, 'migrations');
  const canonicalFile = path.join(root, 'canonical.sql');
  const manifestFile = path.join(root, 'manifest.json');
  await mkdir(migrationsDirectory, { recursive: true });

  const migrations = [
    { version: '20260709000001', name: 'm13a_fixture_one', remoteSql: 'select 1;' },
    { version: '20260709000002', name: 'm13b_fixture_two', remoteSql: 'select 2;' },
  ];

  const manifestMigrations = [];
  for (const migration of migrations) {
    const file = `${migration.version}_${migration.name}.sql`;
    const materialized = ['-- recovered fixture', migration.remoteSql, ''].join('\n');
    await writeFile(path.join(migrationsDirectory, file), materialized, 'utf8');
    manifestMigrations.push({
      version: migration.version,
      name: migration.name,
      file,
      statement_count: 1,
      remote_sql_bytes: Buffer.byteLength(migration.remoteSql),
      remote_sql_sha256: sha256(migration.remoteSql),
      materialized_file_sha256: sha256(materialized),
    });
  }

  const canonicalContent = migrations.map((item) => item.remoteSql).join('\n');
  await writeFile(canonicalFile, canonicalContent, 'utf8');

  const fingerprintInput = manifestMigrations
    .map((migration) => `${migration.version}:${migration.remote_sql_sha256}`)
    .join('\n');
  const expected = {
    firstVersion: migrations[0].version,
    lastVersion: migrations.at(-1).version,
    migrationCount: migrations.length,
    totalRemoteSqlBytes: manifestMigrations.reduce(
      (total, migration) => total + migration.remote_sql_bytes,
      0,
    ),
    combinedRemoteFingerprint: sha256(fingerprintInput),
  };

  const manifest = {
    schema_version: '1.0',
    artifact: 'e14_runtime_migration_recovery_manifest',
    source: 'supabase_migrations.schema_migrations',
    first_version: expected.firstVersion,
    last_version: expected.lastVersion,
    migration_count: expected.migrationCount,
    total_remote_sql_bytes: expected.totalRemoteSqlBytes,
    combined_remote_fingerprint_sha256: expected.combinedRemoteFingerprint,
    canonical_file: path.basename(canonicalFile),
    canonical_file_sha256: sha256(canonicalContent),
    migrations: manifestMigrations,
  };
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { options: { manifestFile, migrationsDirectory, canonicalFile }, expected, manifest };
}

test('publishes trusted inventories for recovered ranges through M15', () => {
  assert.equal(E14_M13_EXPECTED.migrationCount, 165);
  assert.equal(E14_M13_EXPECTED.totalRemoteSqlBytes, 123636);
  assert.equal(E14_M14_EXPECTED.migrationCount, 2);
  assert.equal(E14_M14_EXPECTED.totalRemoteSqlBytes, 12045);
  assert.equal(E14_M15_EXPECTED.migrationCount, 1);
  assert.equal(E14_M15_EXPECTED.totalRemoteSqlBytes, 1536);
});

test('accepts a complete deterministic recovered history', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'estimulo-history-valid-'));
  try {
    const fixture = await createFixture(root);
    const result = await validateRecoveredHistory(fixture.options, fixture.expected);
    assert.equal(result.status, 'valid');
    assert.equal(result.migration_count, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a tampered migration file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'estimulo-history-tampered-'));
  try {
    const fixture = await createFixture(root);
    const target = path.join(
      fixture.options.migrationsDirectory,
      fixture.manifest.migrations[0].file,
    );
    await writeFile(target, 'select tampered;', 'utf8');
    await assert.rejects(
      validateRecoveredHistory(fixture.options, fixture.expected),
      /materialized file hash mismatch/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a manifest with the wrong aggregate fingerprint', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'estimulo-history-fingerprint-'));
  try {
    const fixture = await createFixture(root);
    const manifest = JSON.parse(await readFile(fixture.options.manifestFile, 'utf8'));
    manifest.combined_remote_fingerprint_sha256 = '0'.repeat(64);
    await writeFile(
      fixture.options.manifestFile,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    await assert.rejects(
      validateRecoveredHistory(fixture.options, fixture.expected),
      /manifest combined fingerprint differs/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
