import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const canonical = path.join(root, 'supabase/canonical-migrations');
const migrations = path.join(root, 'supabase/migrations');
const providerBootstrap = path.join(root, 'scripts/database/equivalence/bootstrap-provider-catalog.sql');
const recoveredLastVersion = '20260714161338';
const applicationSchemas = [
  'app_private', 'assessment', 'catalog', 'core', 'diagnostics', 'engagement', 'eventing',
  'governance', 'iam', 'integration', 'intelligence', 'intervention', 'orchestration', 'reporting',
];

function fail(message) { throw new Error(message); }

function psql(databaseUrl, args) {
  const result = spawnSync(
    'psql',
    ['--dbname', databaseUrl, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', ...args],
    { cwd: root, encoding: 'utf8', env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' } },
  );
  if (result.error) fail(`failed to start psql: ${result.error.message}`);
  if (result.status !== 0) fail(`psql exited with status ${result.status}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim());
  return String(result.stdout ?? '');
}

async function manifest(name) {
  return JSON.parse(await readFile(path.join(canonical, name), 'utf8'));
}

function manifestEntries(document, source) {
  return document.migrations.map(({ version, file }) => ({
    version,
    file: path.join(migrations, file),
    source,
  }));
}

async function activeEntries() {
  const files = (await readdir(migrations))
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) > recoveredLastVersion)
    .sort();
  return files.map((file) => ({
    version: file.slice(0, 14),
    file: path.join(migrations, file),
    source: 'active-post-recovery',
  }));
}

async function replayPlan() {
  const [m00m12, m13, m14, m15, m16, active] = await Promise.all([
    manifest('M00_M12_RUNTIME_MANIFEST.json'),
    manifest('M13_RUNTIME_MANIFEST.json'),
    manifest('M14_RUNTIME_MANIFEST.json'),
    manifest('M15_RUNTIME_MANIFEST.json'),
    manifest('M16_RUNTIME_MANIFEST.json'),
    activeEntries(),
  ]);
  const expected = [
    [m00m12.migration_count, 76, 'M00-M12'],
    [m13.migration_count, 165, 'M13'],
    [m14.migration_count, 2, 'M14'],
    [m15.migration_count, 1, 'M15'],
    [m16.migration_count, 1, 'M16'],
    [active.length, 20, 'active'],
  ];
  for (const [actual, count, label] of expected) {
    if (actual !== count) fail(`expected ${count} ${label} migrations, found ${actual}`);
  }
  const plan = [
    ...manifestEntries(m00m12, 'recovered-m00-m12'),
    ...manifestEntries(m13, 'recovered-m13'),
    ...manifestEntries(m14, 'recovered-m14'),
    ...manifestEntries(m15, 'recovered-m15'),
    ...manifestEntries(m16, 'recovered-m16'),
    ...active,
  ].sort((left, right) => left.version.localeCompare(right.version));
  if (new Set(plan.map(({ version }) => version)).size !== plan.length) fail('replay plan contains duplicate versions');
  if (plan.length !== 265) fail(`expected 265 replay files, found ${plan.length}`);
  return plan;
}

export async function replayCleanDatabase(databaseUrl) {
  if (!databaseUrl) fail('DATABASE_URL is required');
  const schemaList = applicationSchemas.map((schema) => `'${schema}'`).join(',');
  const existing = psql(databaseUrl, ['--tuples-only', '--no-align', '--command', `select count(*) from pg_namespace where nspname in (${schemaList});`]).trim();
  if (existing !== '0') fail(`clean replay requires an empty application schema set; found ${existing}`);
  psql(databaseUrl, ['--quiet', '--single-transaction', '--file', providerBootstrap]);
  const plan = await replayPlan();
  for (const [index, migration] of plan.entries()) {
    const relative = path.relative(root, migration.file).replaceAll('\\', '/');
    process.stdout.write(`[${index + 1}/${plan.length}] ${migration.source} ${relative}\n`);
    try { psql(databaseUrl, ['--quiet', '--single-transaction', '--file', migration.file]); }
    catch (error) { fail(`migration failed: ${relative}\n${error.message}`); }
  }
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
    active_post_recovery: 20,
    first_version: plan[0].version,
    last_version: plan.at(-1).version,
  };
}

const direct = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (direct) {
  replayCleanDatabase(process.env.DATABASE_URL)
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
}
