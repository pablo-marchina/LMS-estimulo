import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sqlFile = path.join(repositoryRoot, 'scripts/e14/backend-e2e/backend-e2e.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const result = spawnSync(
  'psql',
  [
    '--dbname', databaseUrl,
    '--no-psqlrc',
    '--set', 'ON_ERROR_STOP=1',
    '--file', sqlFile,
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

if (result.error) {
  throw new Error(`failed to start psql: ${result.error.message}`);
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  throw new Error(`backend E2E failed with psql status ${result.status}`);
}
