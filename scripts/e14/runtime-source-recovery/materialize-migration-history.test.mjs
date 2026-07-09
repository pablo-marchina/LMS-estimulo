import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  materializeMigrationHistory,
  normalizeMigrationRecord,
  sha256,
} from './materialize-migration-history.mjs';

function exportedRecord(version, name, statements) {
  const sql = statements.join('\n');
  return {
    version,
    name,
    statement_count: statements.length,
    sql_bytes: Buffer.byteLength(sql, 'utf8'),
    sql_sha256: sha256(sql),
    statements,
  };
}

async function createFixture(root, records) {
  const inputFile = path.join(root, 'migration-history.local.jsonl');
  await writeFile(
    inputFile,
    `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
    'utf8',
  );
  return inputFile;
}

function outputOptions(root, inputFile) {
  return {
    inputFile,
    migrationsDirectory: path.join(root, 'supabase', 'migrations'),
    canonicalFile: path.join(
      root,
      'supabase',
      'canonical-migrations',
      '20260709051056_m13_e14_runtime_canonical.sql',
    ),
    manifestFile: path.join(
      root,
      'supabase',
      'canonical-migrations',
      'M13_RUNTIME_MANIFEST.json',
    ),
    fromVersion: '20260709051056',
    toVersion: '20260709051057',
  };
}

test('normalizes and verifies exported SQL metadata', () => {
  const record = exportedRecord(
    '20260709051056',
    'm13a_e14_command_foundation',
    ['select 1;', 'select 2;'],
  );

  const normalized = normalizeMigrationRecord(record, 1);
  assert.equal(normalized.statementCount, 2);
  assert.equal(normalized.remoteSql, 'select 1;\nselect 2;');
  assert.equal(normalized.remoteSqlSha256, record.sql_sha256);
});

test('rejects invalid or tampered exports', () => {
  const record = exportedRecord(
    '20260709051056',
    'm13a_e14_command_foundation',
    ['select 1;'],
  );

  assert.throws(
    () => normalizeMigrationRecord({ ...record, sql_sha256: '0'.repeat(64) }, 1),
    /sql_sha256 does not match/,
  );
  assert.throws(
    () => normalizeMigrationRecord({ ...record, version: '2026-07-09' }, 1),
    /invalid migration version/,
  );
  assert.throws(
    () => normalizeMigrationRecord({ ...record, name: 'Invalid Name' }, 1),
    /invalid migration name/,
  );
});

test('materializes deterministic migrations, canonical SQL and manifest', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'estimulo-e14-recovery-'));

  try {
    const records = [
      exportedRecord(
        '20260709051057',
        'm13b_e14_second_step',
        ['create table example_two(id integer);'],
      ),
      exportedRecord(
        '20260709051056',
        'm13a_e14_command_foundation',
        ['create table example_one(id integer);', 'select 1;'],
      ),
    ];
    const inputFile = await createFixture(root, records);
    const options = outputOptions(root, inputFile);

    const firstRun = await materializeMigrationHistory(options);
    assert.equal(firstRun.manifest.migration_count, 2);
    assert.equal(firstRun.manifest.first_version, '20260709051056');
    assert.equal(firstRun.manifest.last_version, '20260709051057');
    assert.ok(firstRun.outputs.every((output) => output.state === 'created'));

    const firstMigration = await readFile(
      path.join(
        options.migrationsDirectory,
        '20260709051056_m13a_e14_command_foundation.sql',
      ),
      'utf8',
    );
    assert.match(firstMigration, /Remote SQL SHA-256:/);
    assert.match(firstMigration, /create table example_one/);

    const canonical = await readFile(options.canonicalFile, 'utf8');
    assert.ok(
      canonical.indexOf('20260709051056') < canonical.indexOf('20260709051057'),
    );

    const manifest = JSON.parse(await readFile(options.manifestFile, 'utf8'));
    assert.equal(manifest.migrations.length, 2);
    assert.equal(manifest.migrations[0].version, '20260709051056');
    assert.equal(manifest.migrations[1].version, '20260709051057');

    const secondRun = await materializeMigrationHistory(options);
    assert.ok(secondRun.outputs.every((output) => output.state === 'unchanged'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses to overwrite a recovered migration with different content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'estimulo-e14-conflict-'));

  try {
    const originalInput = await createFixture(root, [
      exportedRecord(
        '20260709051056',
        'm13a_e14_command_foundation',
        ['select 1;'],
      ),
    ]);
    const options = {
      ...outputOptions(root, originalInput),
      toVersion: '20260709051056',
    };

    await materializeMigrationHistory(options);

    const changedInput = path.join(root, 'changed-migration-history.local.jsonl');
    const changedRecord = exportedRecord(
      '20260709051056',
      'm13a_e14_command_foundation',
      ['select 2;'],
    );
    await writeFile(changedInput, `${JSON.stringify(changedRecord)}\n`, 'utf8');

    await assert.rejects(
      materializeMigrationHistory({ ...options, inputFile: changedInput }),
      /refusing to overwrite different content/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
