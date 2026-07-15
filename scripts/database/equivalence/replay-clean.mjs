import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const canonicalDirectory = path.join(repositoryRoot, 'supabase/canonical-migrations');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const providerBootstrapFile = path.join(
  repositoryRoot,
  'scripts/database/equivalence/bootstrap-provider-catalog.sql',
);
const activeMigrationFiles = Object.freeze([
  '20260714184729_activity_comments_schema.sql',
  '20260714184752_activity_comments_participant_api.sql',
  '20260714184813_activity_comments_operator_api.sql',
  '20260715143709_practice_uploads_schema.sql',
  '20260715143808_practice_uploads_participant_api.sql',
  '20260715143842_practice_uploads_operator_api.sql',
  '20260715155144_learning_credentials_schema.sql',
  '20260715155610_learning_credentials_context.sql',
  '20260715155647_learning_credentials_candidates.sql',
  '20260715155753_learning_credentials_issuance_api.sql',
  '20260715155834_learning_credentials_read_api.sql',
]);
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

function manifestEntries(manifest, source) {
  return manifest.migrations.map((migration) => ({
    version: safeFileName(migration.version, `${source} version`),
    file: path.join(migrationsDirectory, safeFileName(migration.file, `${source} migration file`)),
    source,
  }));
}

function activeEntries() {
  return activeMigrationFiles.map((file) => ({
    version: safeFileName(file.slice(0, 14), 'active migration version'),
    file: path.join(migrationsDirectory, safeFileName(file, 'active migration file')),
    source: 'active-post-recovery',
  }));
}

async function buildReplayPlan() {
  const m00M12Manifest = await readJson(
    path.join(canonicalDirectory, 'M00_M12_RUNTIME_MANIFEST.json'),
  );
  const m13Manifest = await readJson(path.join(canonicalDirectory, 'M13_RUNTIME_MANIFEST.json'));
  const m14Manifest = await readJson(path.join(canonicalDirectory, 'M14_RUNTIME_MANIFEST.json'));
  const m15Manifest = await readJson(path.join(canonicalDirectory, 'M15_RUNTIME_MANIFEST.json'));
  const m16Manifest = await readJson(path.join(canonicalDirectory, 'M16_RUNTIME_MANIFEST.json'));

  const plan = [
    ...manifestEntries(m00M12Manifest, 'recovered-m00-m12'),
    ...manifestEntries(m13Manifest, 'recovered-m13'),
    ...manifestEntries(m14Manifest, 'recovered-m14'),
    ...manifestEntries(m15Manifest, 'recovered-m15'),
    ...manifestEntries(m16Manifest, 'recovered-m16'),
    ...activeEntries(),
  ].sort((left, right) => left.version.localeCompare(right.version));

  const versions = plan.map((migration) => migration.version);
  if (new Set(versions).size !== versions.length) fail('replay plan contains duplicate versions');
  if (m00M12Manifest.migration_count !== 76) {
    fail(`expected 76 M00-M12 migrations, found ${m00M12Manifest.migration_count}`);
  }
  if (m13Manifest.migration_count !== 165) {
    fail(`expected 165 M13 migrations, found ${m13Manifest.migration_count}`);
  }
  if (m14Manifest.migration_count !== 2) {
    fail(`expected 2 M14 migrations, found ${m14Manifest.migration_count}`);
  }
  if (m15Manifest.migration_count !== 1) {
    fail(`expected 1 M15 migration, found ${m15Manifest.migration_count}`);
  }
  if (m16Manifest.migration_count !== 1) {
    fail(`expected 1 M16 migration, found ${m16Manifest.migration_count}`);
  }
  if (activeMigrationFiles.length !== 11) {
    fail(`expected 11 active migrations, found ${activeMigrationFiles.length}`);
  }
  if (plan.length !== 256) fail(`expected 256 replay files, found ${plan.length}`);

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

function provisionProviderCatalog(databaseUrl) {
  process.stdout.write('[bootstrap] provider catalog supabase_migrations.schema_migrations\n');
  try {
    runPsql(databaseUrl, ['--quiet', '--single-transaction', '--file', providerBootstrapFile]);
  } catch (error) {
    fail(
      `provider catalog bootstrap failed: ${path.relative(repositoryRoot, providerBootstrapFile)}\n${error.message}`,
    );
  }
}

function applyMigration(databaseUrl, migration, index, total) {
  const relativePath = path.relative(repositoryRoot, migration.file).replaceAll('\\', '/');
  process.stdout.write(`[${index + 1}/${total}] ${migration.source} ${relativePath}\n`);
  try {
    runPsql(databaseUrl, ['--quiet', '--single-transaction', '--file', migration.file]);
  } catch (error) {
    fail(`migration failed: ${relativePath}\n${error.message}`);
  }
}

export async function replayCleanDatabase(databaseUrl) {
  if (!databaseUrl) fail('DATABASE_URL is required');
  assertCleanDatabase(databaseUrl);
  provisionProviderCatalog(databaseUrl);
  const plan = await buildReplayPlan();
  plan.forEach((migration, index) => applyMigration(databaseUrl, migration, index, plan.length));
  return {
    status: 'replayed',
    transaction_mode: 'one_transaction_per_migration',
    provider_prerequisites: ['supabase_migrations.schema_migrations'],
    migration_files: plan.length,
    recovered_m00_m12: 76,
    recovered_m13: 165,
    recovered_m14: 2,
    recovered_m15: 1,
    recovered_m16: 1,
    active_post_recovery: activeMigrationFiles.length,
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
