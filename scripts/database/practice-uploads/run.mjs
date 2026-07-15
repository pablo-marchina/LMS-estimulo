import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationFiles = [
  '20260715143709_practice_uploads_schema.sql',
  '20260715143808_practice_uploads_participant_api.sql',
  '20260715143842_practice_uploads_operator_api.sql',
].map((file) => path.join(repositoryRoot, 'supabase/migrations', file));
const testFile = path.join(repositoryRoot, 'scripts/database/practice-uploads/test-practice-uploads.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const args = [
  '--dbname', databaseUrl,
  '--no-psqlrc',
  '--set', 'ON_ERROR_STOP=1',
];
for (const migrationFile of migrationFiles) args.push('--file', migrationFile);
args.push('--file', testFile);

const result = spawnSync('psql', args, {
  cwd: repositoryRoot,
  encoding: 'utf8',
  env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' },
});

if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) throw new Error(`practice uploads test failed with psql status ${result.status}`);
