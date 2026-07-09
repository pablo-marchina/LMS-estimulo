import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(new URL('../../docs/implementation/e14-step5-frontend-integration-v0.1.json', import.meta.url), 'utf8'));

test('status avança de bloqueado para parcial', () => {
  assert.equal(contract.step5_status, 'PARTIAL');
  assert.equal(contract.frontend_application_status, 'EXECUTABLE_FOUNDATION');
});

test('aplicação executável e seis rotas estão presentes', () => {
  assert.equal(contract.observed_repository_state.executable_web_application_found, true);
  assert.equal(contract.implemented.routes, 6);
});

test('camada de aplicação cobre backend e consultas', () => {
  assert.equal(contract.implemented.existing_backend_rpcs_mapped, 13);
  assert.equal(contract.implemented.application_read_rpcs, 5);
  assert.equal(contract.implemented.server_application_layer, true);
});

test('tela estática não conta como prova de runtime', () => {
  assert.equal(contract.observed_repository_state.static_screen_accepted_as_runtime_evidence, false);
});

test('conclusão permanece dependente das provas restantes', () => {
  assert.equal(contract.remaining_blockers.length, 3);
  assert.equal(contract.exit_criteria.real_session_flow_proven, false);
  assert.equal(contract.exit_criteria.accessibility_verified, false);
  assert.equal(contract.exit_criteria.journey_completed_through_browser, false);
  assert.equal(contract.exit_criteria.step5_complete, false);
});
