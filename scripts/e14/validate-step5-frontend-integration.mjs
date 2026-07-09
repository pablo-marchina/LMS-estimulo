import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../../docs/implementation/e14-step5-frontend-integration-v0.1.json', import.meta.url);
const contract = JSON.parse(await readFile(path, 'utf8'));

assert.equal(contract.artifact, 'e14_step5_frontend_integration_contract');
assert.equal(contract.step5_status, 'BLOCKED');
assert.equal(contract.frontend_application_status, 'BLOCKED');
assert.equal(contract.openai_content_status, 'BLOCKED');
assert.equal(contract.target_application_path, 'apps/web');
assert.equal(contract.routes.length, 6);
assert.equal(new Set(contract.routes.map((item) => item.route)).size, 6);
assert.equal(contract.observed_repository_state.executable_web_application_found, false);
assert.equal(contract.observed_repository_state.static_screen_accepted_as_runtime_evidence, false);

const expectedRoutes = ['/entrar','/empreendedor','/empreendedor/diagnostico','/empreendedor/atividade/[stepInstanceId]','/empreendedor/resultado','/admin'];
assert.deepEqual(contract.implementation_order, expectedRoutes);

const mappedRpcs = new Set(contract.routes.flatMap((route) => [...route.read_rpcs, ...route.write_rpcs]));
const expectedRpcs = new Set([
  'e14_publish_vertical','e14_create_enrollment','e14_start_journey','e14_start_diagnostic',
  'e14_record_diagnostic_response','e14_complete_diagnostic','e14_start_activity',
  'e14_acknowledge_section','e14_start_quick_check','e14_record_quick_check_answer',
  'e14_submit_quick_check','e14_get_participant_state','e14_get_operator_result'
]);
assert.deepEqual(mappedRpcs, expectedRpcs);

for (const route of contract.routes) {
  for (const state of ['loading', 'error', 'unauthorized']) assert.ok(route.states.includes(state), `${route.route} lacks ${state}`);
}
for (const route of contract.routes.filter((item) => item.actor !== 'public')) assert.ok(route.states.includes('empty'), `${route.route} lacks empty`);
assert.equal(contract.security_boundary.browser_direct_domain_writes, false);
assert.equal(contract.security_boundary.browser_service_role_credentials, false);
assert.ok(contract.security_boundary.required_call_path.includes('server/BFF'));
assert.equal(contract.blockers.length, 3);
assert.equal(Object.values(contract.exit_criteria).every((value) => value === false), true);
assert.equal(contract.accessibility_requirements.length, 6);

console.log(JSON.stringify({
  status: 'ok',
  artifact: contract.artifact,
  step5_status: contract.step5_status,
  routes: contract.routes.length,
  mapped_rpcs: mappedRpcs.size,
  accessibility_requirements: contract.accessibility_requirements.length,
  blockers: contract.blockers.length,
  exit_criteria_met: 0
}, null, 2));
