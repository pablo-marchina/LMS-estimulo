import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const files = [
  'scripts/database/learning-credentials/schema.sql',
  'scripts/database/learning-credentials/issuance-api.sql',
  'scripts/database/learning-credentials/read-api.sql',
  'scripts/database/learning-credentials/test-learning-credentials.sql',
].map((file) => path.join(repositoryRoot, file));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

const result = spawnSync(
  'psql',
  [
    '--dbname', databaseUrl,
    '--no-psqlrc',
    '--set', 'ON_ERROR_STOP=1',
    ...files.flatMap((file) => ['--file', file]),
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
if (result.status !== 0) throw new Error(`learning credentials test failed with psql status ${result.status}`);
