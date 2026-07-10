import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_PATTERN = /^\d{14}$/;
const NAME_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

export function normalizeMigrationRecord(raw, lineNumber = 0) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(`line ${lineNumber}: migration record must be an object`);
  }

  const version = assertString(raw.version, `line ${lineNumber}: version`);
  const name = assertString(raw.name, `line ${lineNumber}: name`);

  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`line ${lineNumber}: invalid migration version ${version}`);
  }
  if (!NAME_PATTERN.test(name)) {
    throw new Error(`line ${lineNumber}: invalid migration name ${name}`);
  }
  if (!Array.isArray(raw.statements) || raw.statements.length === 0) {
    throw new Error(`line ${lineNumber}: statements must be a non-empty array`);
  }
  if (raw.statements.some((statement) => typeof statement !== 'string')) {
    throw new Error(`line ${lineNumber}: every statement must be a string`);
  }

  const statements = [...raw.statements];
  const remoteSql = statements.join('\n');
  const computedSqlBytes = Buffer.byteLength(remoteSql, 'utf8');
  const computedSqlSha256 = sha256(remoteSql);

  if (
    raw.statement_count !== undefined &&
    Number(raw.statement_count) !== statements.length
  ) {
    throw new Error(
      `line ${lineNumber}: statement_count does not match statements length`,
    );
  }

  if (raw.sql_bytes !== undefined && Number(raw.sql_bytes) !== computedSqlBytes) {
    throw new Error(`line ${lineNumber}: sql_bytes does not match exported SQL`);
  }

  if (
    raw.sql_sha256 !== undefined &&
    String(raw.sql_sha256).toLowerCase() !== computedSqlSha256
  ) {
    throw new Error(`line ${lineNumber}: sql_sha256 does not match exported SQL`);
  }

  return {
    version,
    name,
    statements,
    statementCount: statements.length,
    remoteSql,
    remoteSqlBytes: computedSqlBytes,
    remoteSqlSha256: computedSqlSha256,
  };
}

export async function readMigrationJsonLines(inputFile) {
  const source = (await readFile(inputFile, 'utf8')).replace(/^\uFEFF/, '');
  const lines = source.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records = lines.map((line, index) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`line ${index + 1}: invalid JSON: ${error.message}`);
    }
    return normalizeMigrationRecord(parsed, index + 1);
  });

  records.sort((left, right) => left.version.localeCompare(right.version));

  const seenVersions = new Set();
  for (const record of records) {
    if (seenVersions.has(record.version)) {
      throw new Error(`duplicate migration version ${record.version}`);
    }
    seenVersions.add(record.version);
  }

  return records;
}

function migrationFileName(record) {
  return `${record.version}_${record.name}.sql`;
}

function renderMigrationFile(record) {
  const body = record.statements.join('\n\n').trimEnd();
  return [
    '-- Recovered from supabase_migrations.schema_migrations.',
    `-- Remote version: ${record.version}`,
    `-- Remote name: ${record.name}`,
    `-- Remote SQL SHA-256: ${record.remoteSqlSha256}`,
    '-- Do not edit after reconciliation; corrections require a new migration.',
    '',
    body,
    '',
  ].join('\n');
}

function renderCanonicalFile(records) {
  const sections = records.flatMap((record) => [
    `-- BEGIN ${record.version}_${record.name}`,
    `-- Remote SQL SHA-256: ${record.remoteSqlSha256}`,
    record.statements.join('\n\n').trimEnd(),
    `-- END ${record.version}_${record.name}`,
    '',
  ]);

  return [
    '-- Canonical reconstruction of the E14 runtime migration range.',
    '-- Generated deterministically from the Supabase migration history export.',
    '-- This file is documentation/replay evidence; executable history remains',
    '-- represented by the timestamped files under supabase/migrations.',
    '',
    ...sections,
  ].join('\n');
}

async function writeIfAbsentOrEqual(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing !== content) {
      throw new Error(`refusing to overwrite different content: ${filePath}`);
    }
    return 'unchanged';
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
  return 'created';
}

export async function materializeMigrationHistory({
  inputFile,
  migrationsDirectory,
  canonicalFile,
  manifestFile,
  fromVersion,
  toVersion,
}) {
  const records = (await readMigrationJsonLines(inputFile)).filter((record) => {
    if (fromVersion && record.version < fromVersion) return false;
    if (toVersion && record.version > toVersion) return false;
    return true;
  });

  if (records.length === 0) {
    throw new Error('no migration records matched the requested range');
  }

  const outputs = [];
  const manifestMigrations = [];

  for (const record of records) {
    const fileName = migrationFileName(record);
    const filePath = path.join(migrationsDirectory, fileName);
    const content = renderMigrationFile(record);
    const state = await writeIfAbsentOrEqual(filePath, content);

    outputs.push({ filePath, state });
    manifestMigrations.push({
      version: record.version,
      name: record.name,
      file: fileName,
      statement_count: record.statementCount,
      remote_sql_bytes: record.remoteSqlBytes,
      remote_sql_sha256: record.remoteSqlSha256,
      materialized_file_sha256: sha256(content),
    });
  }

  const canonicalContent = renderCanonicalFile(records);
  outputs.push({
    filePath: canonicalFile,
    state: await writeIfAbsentOrEqual(canonicalFile, canonicalContent),
  });

  const combinedFingerprintInput = manifestMigrations
    .map((migration) => `${migration.version}:${migration.remote_sql_sha256}`)
    .join('\n');

  const manifest = {
    schema_version: '1.0',
    artifact: 'e14_runtime_migration_recovery_manifest',
    source: 'supabase_migrations.schema_migrations',
    first_version: records[0].version,
    last_version: records.at(-1).version,
    migration_count: records.length,
    total_remote_sql_bytes: manifestMigrations.reduce(
      (total, migration) => total + migration.remote_sql_bytes,
      0,
    ),
    combined_remote_fingerprint_sha256: sha256(combinedFingerprintInput),
    canonical_file: path.basename(canonicalFile),
    canonical_file_sha256: sha256(canonicalContent),
    migrations: manifestMigrations,
  };

  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  outputs.push({
    filePath: manifestFile,
    state: await writeIfAbsentOrEqual(manifestFile, manifestContent),
  });

  return { manifest, outputs };
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

  for (const required of ['input', 'migrations-dir', 'canonical-file', 'manifest']) {
    if (!values.has(required)) {
      throw new Error(`missing required argument --${required}`);
    }
  }

  return {
    inputFile: values.get('input'),
    migrationsDirectory: values.get('migrations-dir'),
    canonicalFile: values.get('canonical-file'),
    manifestFile: values.get('manifest'),
    fromVersion: values.get('from-version'),
    toVersion: values.get('to-version'),
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const { manifest, outputs } = await materializeMigrationHistory(options);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'ok',
        migration_count: manifest.migration_count,
        first_version: manifest.first_version,
        last_version: manifest.last_version,
        total_remote_sql_bytes: manifest.total_remote_sql_bytes,
        outputs,
      },
      null,
      2,
    )}\n`,
  );
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
