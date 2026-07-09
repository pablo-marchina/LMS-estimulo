import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const implementationUrl = new URL('../../docs/implementation/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('e14-step2-e2e-acceptance-v0.1.json', implementationUrl), 'utf8'));
const parts = await Promise.all(manifest.parts.map(async (name) => JSON.parse(await readFile(new URL(name, implementationUrl), 'utf8'))));
const contract = { ...parts[0], commands: parts.slice(1, 5).flatMap((part) => part.commands), acceptance_scenarios: parts[5].acceptance_scenarios };
const byId = new Map(contract.commands.map((command) => [command.id, command]));
const scenarioById = new Map(contract.acceptance_scenarios.map((scenario) => [scenario.id, scenario]));

test('cada comando mutável exige autorização, transação, idempotência, evento e outbox', () => {
  for (const command of contract.commands.filter((item) => item.kind === 'command')) {
    assert.ok(command.authorization);
    assert.ok(command.transaction);
    assert.ok(command.request_required.includes('Idempotency-Key'));
    assert.ok(command.writes.includes('eventing.events'));
    assert.ok(command.writes.includes('eventing.outbox'));
    assert.ok(command.events.length > 0);
  }
});

test('participante não inscrito recebe 403 sem efeito', () => {
  const command = byId.get('CMD03_START_JOURNEY');
  const failure = command.failures.find((item) => item.code === 'ENROLLMENT_REQUIRED');
  assert.equal(failure.status, 403);
  assert.equal(failure.effects, 'none');
  assert.ok(scenarioById.get('AC02').expected.includes('zero writes'));
});

test('diagnóstico persiste resultado, incerteza, caminho e step na mesma transação', () => {
  const command = byId.get('CMD06_COMPLETE_DIAGNOSTIC_AND_ASSIGN_PATH');
  for (const table of [
    'diagnostics.results', 'diagnostics.dimension_results', 'orchestration.personalization_decisions',
    'orchestration.path_assignments', 'orchestration.step_instances', 'eventing.events', 'eventing.outbox'
  ]) assert.ok(command.writes.includes(table));
  assert.ok(command.events.includes('journey.path.assigned'));
  assert.ok(command.events.includes('personalization.uncertainty.recorded'));
  assert.ok(command.persistence_mapping.includes('quick_check is embedded'));
});

test('falha no quick check não conclui atividade nem concede pontos', () => {
  const submit = byId.get('CMD11_SUBMIT_QUICK_CHECK');
  assert.deepEqual(submit.events_on_fail, ['assessment.attempt.failed']);
  assert.ok(!submit.events_on_fail.includes('learning.activity.completed'));
  assert.ok(!submit.events_on_fail.includes('engagement.points.awarded'));
  assert.ok(scenarioById.get('AC14').expected.includes('zero points'));
});

test('aprovação conclui a vertical e concede sete pontos uma única vez', () => {
  const submit = byId.get('CMD11_SUBMIT_QUICK_CHECK');
  for (const event of [
    'assessment.attempt.passed', 'learning.activity.completed', 'engagement.points.awarded',
    'journey.path.completed', 'journey.instance.completed'
  ]) assert.ok(submit.events_on_pass.includes(event));
  assert.ok(submit.writes_on_pass.includes('engagement.point_ledger'));
  assert.ok(scenarioById.get('AC15').expected.includes('exactly 7 points'));
  assert.ok(scenarioById.get('AC16').expected.includes('ledger remains two entries totaling 7'));
});

test('falhas de evento ou outbox exigem rollback integral', () => {
  for (const commandId of ['CMD01_PUBLISH_VERTICAL', 'CMD06_COMPLETE_DIAGNOSTIC_AND_ASSIGN_PATH', 'CMD11_SUBMIT_QUICK_CHECK']) {
    const command = byId.get(commandId);
    assert.ok(command.failures.some((failure) => failure.code === 'ATOMIC_WRITE_FAILED' && failure.effects.includes('roll')));
  }
  assert.ok(scenarioById.get('AC19').expected.includes('roll back'));
});

test('reuso de chave com payload diferente e concorrência possuem conflitos explícitos', () => {
  assert.equal(contract.global_rules.idempotency.same_key_different_payload, '409 IDEMPOTENCY_KEY_REUSED');
  assert.equal(contract.global_rules.concurrency.stale_response, '409 AGGREGATE_VERSION_CONFLICT');
  assert.ok(scenarioById.get('AC17').expected.includes('409 IDEMPOTENCY_KEY_REUSED'));
  assert.ok(scenarioById.get('AC18').expected.includes('409 AGGREGATE_VERSION_CONFLICT'));
});

test('resultado administrativo não contém interpretação de crédito ou arquétipo', () => {
  const query = byId.get('QRY02_GET_ADMIN_RESULT');
  assert.ok(query.display_constraints.includes('no credit score'));
  assert.ok(query.display_constraints.includes('no archetype'));
  assert.ok(query.display_constraints.includes('no inferred persistence or risk'));
});

test('lacunas de implementação permanecem explícitas', () => {
  const gapIds = new Set(contract.known_gaps.map((gap) => gap.id));
  assert.ok(gapIds.has('GAP01_COMMAND_LAYER'));
  assert.ok(gapIds.has('GAP02_PUBLISHED_IMMUTABILITY'));
  assert.ok(gapIds.has('GAP03_APPLICATION'));
  assert.ok(gapIds.has('GAP04_AUTH_MAPPING_PROOF'));
  assert.equal(contract.status, 'approved_acceptance_contract_not_implemented');
});
