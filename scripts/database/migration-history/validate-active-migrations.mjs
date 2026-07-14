import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const recoveredHistoryLastVersion = '20260714161338';
const expectedActiveMigrations = Object.freeze([
  '20260714184729_activity_comments_schema.sql',
  '20260714184752_activity_comments_participant_api.sql',
  '20260714184813_activity_comments_operator_api.sql',
]);

export async function validateActiveMigrations() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) > recoveredHistoryLastVersion)
    .sort();

  assert.deepEqual(
    files,
    expectedActiveMigrations,
    'active migration set differs from the applied development/test history',
  );

  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, 'active migration versions are not unique');

  return {
    status: 'valid',
    recovered_history_last_version: recoveredHistoryLastVersion,
    active_migration_count: files.length,
    first_active_version: versions[0],
    last_active_version: versions.at(-1),
    files,
  };
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  validateActiveMigrations()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
