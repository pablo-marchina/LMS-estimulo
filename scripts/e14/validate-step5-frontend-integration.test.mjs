import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(new URL('../../docs/implementation/e14-step5-frontend-integration-v0.1.json', import.meta.url), 'utf8'));
const byRoute = new Map(contract.routes.map((item) => [item.route, item]));

test('passo permanece bloqueado sem aplicação executável', () => {
  assert.equal(contract.step5_status, 'BLOCKED');
  assert.equal(contract.frontend_application_status, 'BLOCKED');
  assert.equal(contract.observed_repository_state.executable_web_application_found, false);
});

test('seis rotas mínimas estão definidas na ordem exigida', () => {
  assert.deepEqual(contract.implementation_order, contract.routes.map((item) => item.route));
  assert.equal(contract.routes.length, 6);
});

test('home do participante consulta estado e inicia jornada', () => {
  assert.deepEqual(byRoute.get('/empreendedor').read_rpcs, ['e14_get_participant_state']);
  assert.deepEqual(byRoute.get('/empreendedor').write_rpcs, ['e14_start_journey']);
});

test('diagnóstico cobre os três comandos e refresh de estado', () => {
  const route = byRoute.get('/empreendedor/diagnostico');
  assert.ok(route.read_rpcs.includes('e14_get_participant_state'));
  for (const rpc of ['e14_start_diagnostic', 'e14_record_diagnostic_response', 'e14_complete_diagnostic']) assert.ok(route.write_rpcs.includes(rpc));
});

test('atividade cobre conteúdo, seções, avaliação e submissão', () => {
  const route = byRoute.get('/empreendedor/atividade/[stepInstanceId]');
  assert.equal(route.write_rpcs.length, 5);
  assert.ok(route.states.includes('failed_attempt'));
  assert.ok(route.states.includes('passed_attempt'));
});

test('admin publica, matricula e consulta evidências', () => {
  const route = byRoute.get('/admin');
  assert.deepEqual(route.write_rpcs, ['e14_publish_vertical', 'e14_create_enrollment']);
  assert.deepEqual(route.read_rpcs, ['e14_get_operator_result']);
});

test('credenciais privilegiadas e escritas diretas são proibidas no browser', () => {
  assert.equal(contract.security_boundary.browser_service_role_credentials, false);
  assert.equal(contract.security_boundary.browser_direct_domain_writes, false);
});

test('estados, acessibilidade e saída não podem ser simulados', () => {
  for (const route of contract.routes) {
    assert.ok(route.states.includes('loading'));
    assert.ok(route.states.includes('error'));
    assert.ok(route.states.includes('unauthorized'));
  }
  assert.equal(contract.accessibility_requirements.length, 6);
  assert.equal(contract.exit_criteria.journey_completed_without_manual_database_interaction, false);
  assert.equal(contract.observed_repository_state.static_screen_accepted_as_runtime_evidence, false);
});
