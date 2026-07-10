import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationFile = path.join(
  repositoryRoot,
  'supabase/pending-migrations/20260710160000_m15a_e14_semantic_activity_session_close.sql',
);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

function runPsql(args) {
  const result = spawnSync(
    'psql',
    ['--dbname', databaseUrl, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', ...args],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' },
    },
  );

  if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(
      `psql exited with status ${result.status}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim(),
    );
  }
  return result.stdout ?? '';
}

runPsql(['--quiet', '--single-transaction', '--file', migrationFile]);

const validationSql = String.raw`
with replacement as (
  select p.*
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app_private'
     and p.proname = 'e14_close_completed_activity_session'
     and pg_get_function_identity_arguments(p.oid) = 'p_activity_session_id uuid'
), consumer as (
  select pg_get_functiondef('app_private.e14_i1_state(jsonb,uuid)'::regprocedure) as definition
), legacy as (
  select
    count(*) filter (where n.nspname = 'app_private')::integer as private_count,
    count(*) filter (where n.nspname = 'public')::integer as public_count,
    count(*)::integer as total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('app_private', 'public')
    and p.proname ~ '^e14_'
    and exists (
      select 1
      from unnest(coalesce(p.proargnames, array[]::text[])) as argument_name
      where argument_name ~ '^[a-z]$'
    )
)
select jsonb_build_object(
  'old_exists', to_regprocedure('app_private.e14_close_activity_session(uuid)') is not null,
  'new_exists', to_regprocedure('app_private.e14_close_completed_activity_session(uuid)') is not null,
  'new_argument_names', coalesce((select to_jsonb(proargnames) from replacement), '[]'::jsonb),
  'new_security_definer', coalesce((select prosecdef from replacement), false),
  'new_search_path', coalesce((select to_jsonb(proconfig) from replacement), '[]'::jsonb),
  'consumer_uses_new', position('e14_close_completed_activity_session' in (select definition from consumer)) > 0,
  'consumer_uses_old', position('e14_close_activity_session' in (select definition from consumer)) > 0,
  'legacy_private_helper_count', (select private_count from legacy),
  'legacy_public_rpc_count', (select public_count from legacy),
  'legacy_function_count', (select total_count from legacy)
)::text;
`;

const raw = runPsql(['--tuples-only', '--no-align', '--command', validationSql]).trim();
const result = JSON.parse(raw);

const expected = {
  old_exists: false,
  new_exists: true,
  new_argument_names: ['p_activity_session_id'],
  new_security_definer: true,
  consumer_uses_new: true,
  consumer_uses_old: false,
  legacy_private_helper_count: 106,
  legacy_public_rpc_count: 8,
  legacy_function_count: 114,
};

for (const [field, value] of Object.entries(expected)) {
  if (JSON.stringify(result[field]) !== JSON.stringify(value)) {
    throw new Error(`${field} mismatch: expected ${JSON.stringify(value)}, got ${JSON.stringify(result[field])}`);
  }
}

if (!result.new_search_path.includes('search_path=pg_catalog')) {
  throw new Error(`semantic helper search_path mismatch: ${JSON.stringify(result.new_search_path)}`);
}

process.stdout.write(`${JSON.stringify({ status: 'passed', ...result }, null, 2)}\n`);
