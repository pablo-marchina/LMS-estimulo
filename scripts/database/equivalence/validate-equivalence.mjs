import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baselinePath = path.join(
  repositoryRoot,
  'supabase/canonical-migrations/REMOTE_SCHEMA_BASELINE.json',
);
const inventorySqlPath = path.join(repositoryRoot, 'scripts/database/equivalence/inventory.sql');
const diagnosticSqlPath = path.join(repositoryRoot, 'scripts/database/equivalence/diagnostic.sql');

function runJsonSql(databaseUrl, sqlPath, label) {
  const result = spawnSync(
    'psql',
    [
      '--dbname',
      databaseUrl,
      '--no-psqlrc',
      '--set',
      'ON_ERROR_STOP=1',
      '--quiet',
      '--tuples-only',
      '--no-align',
      '--file',
      sqlPath,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        PGOPTIONS: '-c client_min_messages=warning',
      },
    },
  );

  if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `${label} query failed with status ${result.status}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim(),
    );
  }

  const lines = String(result.stdout)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length !== 1) {
    throw new Error(`expected one ${label} JSON row, received ${lines.length}`);
  }
  return JSON.parse(lines[0]);
}

function normalizedCategory(value) {
  if (!value || !Array.isArray(value.sha256_chunks)) return value;
  const sha256 = value.sha256_chunks.join('');
  assert.match(sha256, /^[0-9a-f]{64}$/, 'chunked baseline digest is invalid');
  const { sha256_chunks: _chunks, ...rest } = value;
  return { ...rest, sha256 };
}

function normalizedCategories(categories) {
  return Object.fromEntries(
    Object.entries(categories).map(([name, value]) => [name, normalizedCategory(value)]),
  );
}

function categoryDiff(expected, actual) {
  const names = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  return names
    .map((name) => ({
      category: name,
      expected: expected[name] ?? null,
      actual: actual[name] ?? null,
      matches: isDeepStrictEqual(expected[name] ?? null, actual[name] ?? null),
    }))
    .filter((item) => !item.matches);
}

export async function validateSchemaEquivalence(databaseUrl) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const actual = runJsonSql(databaseUrl, inventorySqlPath, 'inventory');
  const expected = baseline.inventory;
  const expectedCategories = normalizedCategories(expected.categories);
  const differences = categoryDiff(expectedCategories, actual.categories);

  assert.equal(actual.schema_version, expected.schema_version, 'inventory schema version differs');
  assert.equal(actual.postgres_major, expected.postgres_major, 'PostgreSQL major version differs');
  if (differences.length > 0) {
    const diagnostic = runJsonSql(databaseUrl, diagnosticSqlPath, 'diagnostic');
    throw new Error(
      `schema equivalence failed\n${JSON.stringify({ differences, diagnostic }, null, 2)}`,
    );
  }

  return {
    status: 'equivalent',
    source: baseline.source,
    observed_at: baseline.observed_at,
    postgres_major: actual.postgres_major,
    categories: actual.categories,
  };
}

async function main() {
  const result = await validateSchemaEquivalence(process.env.DATABASE_URL);
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
