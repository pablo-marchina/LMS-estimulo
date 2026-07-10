import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const canonicalDirectory = path.join(repositoryRoot, 'supabase/canonical-migrations');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const applicationSchemas = [
  'app_private',
  'assessment',
  'catalog',
  'core',
  'diagnostics',
  'engagement',
  'eventing',
  'governance',
  'iam',
  'integration',
  'intelligence',
  'intervention',
  'orchestration',
  'reporting',
];

function fail(message) {
  throw new Error(message);
}

function runPsql(databaseUrl, args, options = {}) {
  const result = spawnSync(
    'psql',
    ['--dbname', databaseUrl, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', ...args],
    {
      cwd: repositoryRoot,
      encoding: options.encoding ?? 'utf8',
      stdio: options.stdio ?? 'pipe',
      env: {
        ...process.env,
        PGOPTIONS: '-c client_min_messages=warning',
      },
    },
  );

  if (result.error) fail(`failed to start psql: ${result.error.message}`);
  if (result.status !== 0) {
    const stdout = result.stdout?.toString() ?? '';
    const stderr = result.stderr?.toString() ?? '';
    fail(`psql exited with status ${result.status}\n${stdout}\n${stderr}`.trim());
  }
  return result.stdout?.toString() ?? '';
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function safeFileName(value, field) {
  if (typeof value !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z_.-]*$/.test(value)) {
    fail(`invalid ${field}: ${String(value)}`);
  }
  return value;
}

async function buildReplayPlan() {
  const baselineManifest = await readJson(path.join(canonicalDirectory, 'MIGRATION_MANIFEST.json'));
  const m13Manifest = await readJson(path.join(canonicalDirectory, 'M13_RUNTIME_MANIFEST.json'));
  const m14Manifest = await readJson(path.join(canonicalDirectory, 'M14_RUNTIME_MANIFEST.json'));

  const baseline = baselineManifest.migrations.map((migration) => ({
    version: safeFileName(migration.file.split('_', 1)[0], 'baseline version'),
    file: path.join(canonicalDirectory, safeFileName(migration.file, 'baseline migration file')),
    source: 'canonical-m00-m12',
  }));
  const recovered = [...m13Manifest.migrations, ...m14Manifest.migrations].map((migration) => ({
    version: safeFileName(migration.version, 'recovered version'),
    file: path.join(migrationsDirectory, safeFileName(migration.file, 'recovered migration file')),
    source: migration.version <= m13Manifest.last_version ? 'recovered-m13' : 'recovered-m14',
  }));

  const plan = [...baseline, ...recovered].sort((left, right) => left.version.localeCompare(right.version));
  const versions = plan.map((migration) => migration.version);
  if (new Set(versions).size !== versions.length) fail('replay plan contains duplicate versions');
  if (baseline.length !== 13) fail(`expected 13 M00-M12 migrations, found ${baseline.length}`);
  if (m13Manifest.migration_count !== 165) fail(`expected 165 M13 migrations, found ${m13Manifest.migration_count}`);
  if (m14Manifest.migration_count !== 2) fail(`expected 2 M14 migrations, found ${m14Manifest.migration_count}`);
  if (plan.length !== 180) fail(`expected 180 replay files, found ${plan.length}`);

  return plan;
}

function assertCleanDatabase(databaseUrl) {
  const literalList = applicationSchemas.map((schema) => `'${schema}'`).join(',');
  const output = runPsql(databaseUrl, [
    '--tuples-only',
    '--no-align',
    '--command',
    `select count(*) from pg_namespace where nspname in (${literalList});`,
  ]).trim();
  if (output !== '0') fail(`clean replay requires an empty application schema set; found ${output}`);
}

function applyMigration(databaseUrl, migration, index, total) {
  const relativePath = path.relative(repositoryRoot, migration.file).replaceAll('\\', '/');
  process.stdout.write(`[${index + 1}/${total}] ${migration.source} ${relativePath}\n`);
  try {
    runPsql(databaseUrl, ['--quiet', '--file', migration.file]);
  } catch (error) {
    fail(`migration failed: ${relativePath}\n${error.message}`);
  }
}

export async function replayCleanDatabase(databaseUrl) {
  if (!databaseUrl) fail('DATABASE_URL is required');
  assertCleanDatabase(databaseUrl);
  const plan = await buildReplayPlan();
  plan.forEach((migration, index) => applyMigration(databaseUrl, migration, index, plan.length));
  return {
    status: 'replayed',
    migration_files: plan.length,
    canonical_m00_m12: 13,
    recovered_m13: 165,
    recovered_m14: 2,
    first_version: plan[0].version,
    last_version: plan.at(-1).version,
  };
}

async function main() {
  const result = await replayCleanDatabase(process.env.DATABASE_URL);
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
