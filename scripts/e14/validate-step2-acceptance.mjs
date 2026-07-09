import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contractPath = join(root, 'docs/implementation/e14-step2-e2e-acceptance-v0.1.json');
const eventCatalogPath = join(root, 'docs/events/EVENT_CATALOG_V0_1.md');
const migrationDir = join(root, 'supabase/canonical-migrations');

const manifest = JSON.parse(await readFile(contractPath, 'utf8'));
const loadedParts = await Promise.all(manifest.parts.map(async (name) => JSON.parse(await readFile(join(root, 'docs/implementation', name), 'utf8'))));
const contract = { ...loadedParts[0], commands: loadedParts.slice(1, 5).flatMap((part) => part.commands), acceptance_scenarios: loadedParts[5].acceptance_scenarios };
assert.equal(manifest.artifact, 'e14_step2_e2e_acceptance_contract_manifest');
const eventCatalog = await readFile(eventCatalogPath, 'utf8');
const migrationFiles = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort();
const migrationSql = (await Promise.all(migrationFiles.map((name) => readFile(join(migrationDir, name), 'utf8')))).join('\n');

assert.equal(contract.artifact, 'e14_step2_e2e_acceptance_contract');
assert.equal(contract.status, 'approved_acceptance_contract_not_implemented');
assert.equal(contract.openai_content_status, 'BLOCKED');
assert.equal(contract.step2_exit_criteria.step2_status, 'DONE');

const ids = contract.commands.map((command) => command.id);
assert.equal(new Set(ids).size, ids.length, 'command IDs must be unique');

const requiredFlow = [
  'AUTH01_AUTHENTICATE_PARTICIPANT',
  'CMD01_PUBLISH_VERTICAL',
  'CMD02_CREATE_ENROLLMENT',
  'CMD03_START_JOURNEY',
  'CMD04_START_DIAGNOSTIC',
  'CMD05_RECORD_DIAGNOSTIC_RESPONSE',
  'CMD06_COMPLETE_DIAGNOSTIC_AND_ASSIGN_PATH',
  'CMD07_START_ACTIVITY',
  'CMD08_ACKNOWLEDGE_ACTIVITY_SECTION',
  'CMD09_START_QUICK_CHECK',
  'CMD10_RECORD_QUICK_CHECK_ANSWER',
  'CMD11_SUBMIT_QUICK_CHECK',
  'QRY01_GET_PARTICIPANT_STATE',
  'QRY02_GET_ADMIN_RESULT'
];
assert.deepEqual(ids, requiredFlow);

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH']);
for (const command of contract.commands) {
  assert.ok(command.authorization, `${command.id} lacks authorization`);
  assert.ok(command.transaction, `${command.id} lacks transaction rule`);
  assert.ok(Array.isArray(command.reads), `${command.id} lacks reads`);
  assert.ok(Array.isArray(command.writes), `${command.id} lacks writes`);
  assert.ok(Array.isArray(command.events), `${command.id} lacks events`);
  assert.ok(command.success?.status, `${command.id} lacks success response`);
  assert.ok(command.idempotency, `${command.id} lacks repetition behavior`);
  assert.ok(Array.isArray(command.failures), `${command.id} lacks failure behavior`);

  if (command.kind === 'command' && mutatingMethods.has(command.method)) {
    assert.ok(command.request_required.includes('Idempotency-Key'), `${command.id} must require Idempotency-Key`);
    assert.ok(command.writes.includes('eventing.events'), `${command.id} must write canonical event`);
    assert.ok(command.writes.includes('eventing.outbox'), `${command.id} must write outbox`);
    assert.ok(command.events.length > 0, `${command.id} must emit at least one event`);
  }
}

const eventNames = new Set();
for (const command of contract.commands) {
  for (const key of Object.keys(command)) {
    if (key === 'events' || key.startsWith('events_')) {
      for (const eventName of command[key]) eventNames.add(eventName);
    }
  }
}
for (const eventName of eventNames) {
  assert.ok(eventCatalog.includes(`\`${eventName}\``), `event not found in canonical catalog: ${eventName}`);
}

const tableNames = new Set();
for (const command of contract.commands) {
  for (const key of Object.keys(command)) {
    if (key === 'reads' || key === 'writes' || key.startsWith('writes_')) {
      for (const table of command[key]) tableNames.add(table);
    }
  }
}
for (const table of tableNames) {
  const [schema, name] = table.split('.');
  const patterns = [
    `create table if not exists ${schema}.${name}`,
    `create table ${schema}.${name}`,
    `CREATE TABLE IF NOT EXISTS ${schema}.${name}`,
    `CREATE TABLE ${schema}.${name}`
  ];
  assert.ok(patterns.some((pattern) => migrationSql.includes(pattern)), `table not found in canonical migrations: ${table}`);
}

const scenarioIds = contract.acceptance_scenarios.map((scenario) => scenario.id);
assert.equal(new Set(scenarioIds).size, scenarioIds.length, 'acceptance scenario IDs must be unique');
assert.ok(contract.acceptance_scenarios.length >= 20);
for (const scenario of contract.acceptance_scenarios) {
  assert.ok(scenario.case && scenario.expected, `${scenario.id} is incomplete`);
  assert.ok(Array.isArray(scenario.evidence) && scenario.evidence.length > 0, `${scenario.id} lacks evidence`);
}

const expectedText = contract.acceptance_scenarios.map((scenario) => scenario.expected).join('\n');
for (const required of ['401', '403', '404', '409', '422', '7 points', 'roll back']) {
  assert.ok(expectedText.includes(required), `acceptance matrix lacks ${required}`);
}

const gapIds = new Set(contract.known_gaps.map((gap) => gap.id));
for (const requiredGap of ['GAP01_COMMAND_LAYER', 'GAP02_PUBLISHED_IMMUTABILITY', 'GAP03_APPLICATION', 'GAP04_AUTH_MAPPING_PROOF']) {
  assert.ok(gapIds.has(requiredGap), `missing explicit gap ${requiredGap}`);
}

assert.equal(contract.persistence_normalization.diagnosis.includes('before path assignment'), true);
assert.equal(contract.global_rules.transaction_rule.includes('commit or roll back together'), true);
assert.equal(contract.global_rules.idempotency.same_key_different_payload, '409 IDEMPOTENCY_KEY_REUSED');

console.log(JSON.stringify({
  status: 'ok',
  artifact: contract.artifact,
  commands: contract.commands.length,
  write_commands: contract.commands.filter((command) => command.kind === 'command').length,
  acceptance_scenarios: contract.acceptance_scenarios.length,
  canonical_events: eventNames.size,
  referenced_tables: tableNames.size,
  explicit_gaps: contract.known_gaps.length,
  step2_status: contract.step2_exit_criteria.step2_status
}, null, 2));
