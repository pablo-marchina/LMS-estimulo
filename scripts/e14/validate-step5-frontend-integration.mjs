import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(new URL('../../docs/implementation/e14-step5-frontend-integration-v0.1.json', import.meta.url), 'utf8'));

assert.equal(contract.artifact, 'e14_step5_frontend_integration_contract');
assert.equal(contract.step5_status, 'PARTIAL');
assert.equal(contract.frontend_application_status, 'EXECUTABLE_FOUNDATION');
assert.equal(contract.openai_content_status, 'BLOCKED');
assert.equal(contract.target_application_path, 'apps/web');
assert.equal(contract.observed_repository_state.executable_web_application_found, true);
assert.equal(contract.observed_repository_state.static_screen_accepted_as_runtime_evidence, false);
assert.equal(contract.implemented.routes, 6);
assert.equal(contract.implemented.existing_backend_rpcs_mapped, 13);
assert.equal(contract.implemented.application_read_rpcs, 5);
assert.equal(contract.implemented.structural_tests_passed, 13);
assert.equal(contract.remaining_blockers.length, 3);
assert.equal(contract.exit_criteria.six_routes_executable, true);
assert.equal(contract.exit_criteria.real_session_flow_proven, false);
assert.equal(contract.exit_criteria.accessibility_verified, false);
assert.equal(contract.exit_criteria.journey_completed_through_browser, false);
assert.equal(contract.exit_criteria.step5_complete, false);

const met = Object.values(contract.exit_criteria).filter(Boolean).length;
console.log(JSON.stringify({
  status: 'ok',
  step5_status: contract.step5_status,
  routes: contract.implemented.routes,
  existing_backend_rpcs: contract.implemented.existing_backend_rpcs_mapped,
  application_read_rpcs: contract.implemented.application_read_rpcs,
  remaining_blockers: contract.remaining_blockers.length,
  exit_criteria_met: met
}, null, 2));
