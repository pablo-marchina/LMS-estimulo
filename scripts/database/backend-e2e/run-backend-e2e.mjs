import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtureFile = path.join(repositoryRoot, 'scripts/database/backend-e2e/setup-runtime-fixture.sql');
const eventSchemaIdsFile = path.join(repositoryRoot, 'scripts/database/backend-e2e/normalize-event-schema-ids.sql');
const sqlFile = path.join(repositoryRoot, 'scripts/database/backend-e2e/backend-e2e-autocommit.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

function runPsql(args) {
  return spawnSync('psql', [
    '--dbname', databaseUrl,
    '--no-psqlrc',
    '--set', 'ON_ERROR_STOP=1',
    ...args,
  ], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' },
  });
}

function writeResult(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

const result = runPsql([
  '--file', fixtureFile,
  '--file', eventSchemaIdsFile,
  '--file', sqlFile,
]);

if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
writeResult(result);

if (result.status !== 0) {
  const diagnosticSql = `
    select jsonb_build_object(
      'ledger', coalesce((
        select jsonb_agg(jsonb_build_object(
          'code', definition.code,
          'amount', ledger.amount,
          'journey_instance_id', ledger.journey_instance_id,
          'source_event_id', ledger.source_event_id,
          'reason', ledger.reason
        ) order by ledger.occurred_at, ledger.id)
        from engagement.point_ledger ledger
        join engagement.point_rule_versions version on version.id = ledger.point_rule_version_id
        join engagement.point_rule_definitions definition on definition.id = version.point_rule_definition_id
      ), '[]'::jsonb),
      'balances', coalesce((
        select jsonb_agg(jsonb_build_object(
          'journey_instance_id', projection.journey_instance_id,
          'balance', projection.balance,
          'projection_version', projection.projection_version
        ) order by projection.updated_at, projection.id)
        from engagement.point_balance_projections projection
      ), '[]'::jsonb),
      'relevant_events', coalesce((
        select jsonb_agg(jsonb_build_object(
          'event_name', event.event_name,
          'journey_instance_id', event.journey_instance_id,
          'organization_id', event.organization_id,
          'aggregate_type', event.aggregate_type,
          'aggregate_id', event.aggregate_id
        ) order by event.occurred_at, event.event_id)
        from eventing.events event
        where event.event_name in (
          'journey.instance.started',
          'diagnostic.session.completed',
          'engagement.points.awarded'
        )
      ), '[]'::jsonb)
    ) as point_state_diagnostic;
  `;
  const diagnostic = runPsql(['--command', diagnosticSql]);
  process.stderr.write('\n[backend-e2e] point-state diagnostic after failure\n');
  writeResult(diagnostic);
  throw new Error(`backend E2E failed with psql status ${result.status}`);
}
