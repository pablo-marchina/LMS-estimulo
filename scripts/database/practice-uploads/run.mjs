import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const schemaFile = path.join(repositoryRoot, 'scripts/database/practice-uploads/practice-uploads.sql');
const participantFile = path.join(repositoryRoot, 'scripts/database/practice-uploads/participant-api.sql');
const operatorFile = path.join(repositoryRoot, 'scripts/database/practice-uploads/practice-uploads-fixes.sql');
const testFile = path.join(repositoryRoot, 'scripts/database/practice-uploads/test-practice-uploads.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const result = spawnSync(
  'psql',
  [
    '--dbname', databaseUrl,
    '--no-psqlrc',
    '--set', 'ON_ERROR_STOP=1',
    '--file', schemaFile,
    '--file', participantFile,
    '--file', operatorFile,
    '--file', testFile,
  ],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' },
  },
);

if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) throw new Error(`practice uploads test failed with psql status ${result.status}`);
