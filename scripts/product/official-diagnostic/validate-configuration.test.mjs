import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  defaultManifestPath,
  validateOfficialDiagnosticManifest,
} from './validate-configuration.mjs';

const baseline = JSON.parse(await readFile(defaultManifestPath, 'utf8'));
const clone = () => structuredClone(baseline);

test('accepts the blocked official diagnostic manifest', () => {
  const result = validateOfficialDiagnosticManifest(clone());
  assert.equal(result.status, 'valid');
  assert.equal(result.question_count, 12);
  assert.equal(result.dimension_count, 5);
  assert.equal(result.archetype_count, 4);
  assert.equal(result.publishable, false);
  assert.ok(result.runtime_blocker_count > 0);
});

test('rejects promotion of prototype Q13', () => {
  const manifest = clone();
  manifest.questions[11].code = 'Q13';
  assert.throws(() => validateOfficialDiagnosticManifest(manifest));
});

test('rejects invented scoring while methodology is missing', () => {
  const manifest = clone();
  manifest.questions[0].scoring = [{ option: 'A', dimension: 'D1', weight: 1 }];
  assert.throws(
    () => validateOfficialDiagnosticManifest(manifest),
    /scoring must remain empty/,
  );
});

test('rejects invented exact wording while wording is not approved', () => {
  const manifest = clone();
  manifest.questions[0].exact_wording = 'Texto ainda não homologado';
  assert.throws(
    () => validateOfficialDiagnosticManifest(manifest),
    /exact wording must remain empty/,
  );
});

test('rejects result copy and activation rules without official evidence', () => {
  const manifest = clone();
  manifest.archetypes[0].official_result_copy = 'Resultado inventado';
  manifest.archetypes[0].activation_rules = [{ action: 'assign_journey' }];
  assert.throws(() => validateOfficialDiagnosticManifest(manifest));
});

test('rejects publication while runtime blockers remain', () => {
  const manifest = clone();
  manifest.instrument.publishable = true;
  manifest.instrument.lifecycle = 'published';
  manifest.publication.preview_allowed = true;
  manifest.publication.publish_allowed = true;
  assert.throws(() => validateOfficialDiagnosticManifest(manifest));
});

test('rejects blocker inventory that diverges from the evidence matrix', () => {
  const manifest = clone();
  manifest.runtime_blockers = manifest.runtime_blockers.slice(1);
  assert.throws(() => validateOfficialDiagnosticManifest(manifest));
});
