import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const defaultManifestPath = path.join(
  repositoryRoot,
  'config/official-diagnostic/v3/manifest.json',
);

const allowedEvidenceStatuses = new Set(['confirmed', 'conflicting', 'missing', 'non_runtime']);
const expectedQuestionCodes = Array.from({ length: 12 }, (_, index) => `Q${index + 1}`);
const expectedDimensions = new Map([
  ['D1', 'Gestão financeira'],
  ['D2', 'Disciplina e hábito'],
  ['D3', 'Visão e planejamento'],
  ['D4', 'Perfil empreendedor'],
  ['D5', 'Relação com crédito e risco'],
]);
const expectedArchetypes = new Map([
  ['fazedor', 'Fazedor'],
  ['batalhador', 'Batalhador'],
  ['construtor', 'Construtor'],
  ['navegador', 'Navegador'],
]);

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function evidenceById(manifest) {
  return new Map(manifest.evidence_matrix.map((item) => [item.id, item]));
}

export function validateOfficialDiagnosticManifest(manifest) {
  assert.equal(manifest.schema_version, '1.0');
  assert.equal(manifest.instrument.id, 'estimulo_behavioral_archetype');
  assert.equal(manifest.instrument.version, '3');
  assert.equal(manifest.instrument.authority, 'official_reference_first');

  const sourceIds = manifest.sources.map((source) => source.id);
  assertUnique(sourceIds, 'source ids');
  for (const source of manifest.sources) {
    assert.match(source.path, /^(docs|config)\//, `invalid source path for ${source.id}`);
    assert.ok(source.role, `source ${source.id} must declare a role`);
  }

  assert.equal(manifest.confirmed_structure.question_count, 12);
  assert.equal(manifest.confirmed_structure.dimension_count, 5);
  assert.equal(manifest.confirmed_structure.archetype_count, 4);
  assert.equal(manifest.confirmed_structure.maturity_axis, 'separate');
  assert.equal(manifest.confirmed_structure.journey_readiness_axis, 'separate');
  assert.equal(manifest.confirmed_structure.prototype_q13_included, false);
  assert.equal(manifest.confirmed_structure.prototype_scoring_authoritative, false);
  assert.equal(
    manifest.confirmed_structure.confidence_policy,
    'null_until_methodology_approved',
  );

  assert.equal(manifest.dimensions.length, expectedDimensions.size);
  assertUnique(manifest.dimensions.map((dimension) => dimension.code), 'dimension codes');
  for (const dimension of manifest.dimensions) {
    assert.equal(expectedDimensions.get(dimension.code), dimension.name);
    assert.equal(dimension.status, 'confirmed');
  }

  assert.equal(manifest.archetypes.length, expectedArchetypes.size);
  assertUnique(manifest.archetypes.map((archetype) => archetype.code), 'archetype codes');
  for (const archetype of manifest.archetypes) {
    assert.equal(expectedArchetypes.get(archetype.code), archetype.name);
    assert.equal(archetype.status, 'confirmed');
    assert.equal(archetype.narrative_is_scoring_rule, false);
    assert.equal(archetype.official_result_copy, null);
    assert.deepEqual(archetype.activation_rules, []);
  }

  assert.equal(manifest.questions.length, expectedQuestionCodes.length);
  const questionCodes = manifest.questions.map((question) => question.code);
  assertUnique(questionCodes, 'question codes');
  assert.deepEqual(sorted(questionCodes), sorted(expectedQuestionCodes));
  assert.ok(!questionCodes.includes('Q13'), 'prototype Q13 cannot enter the official form');

  const dimensionCodes = new Set(expectedDimensions.keys());
  for (const question of manifest.questions) {
    assert.equal(question.structure_status, 'confirmed');
    assert.ok(question.response_type, `${question.code} must declare its structural response type`);
    assert.ok(question.dimensions.length > 0, `${question.code} must reference at least one dimension`);
    for (const dimension of question.dimensions) {
      assert.ok(dimensionCodes.has(dimension), `${question.code} references unknown ${dimension}`);
    }
    assert.ok(
      ['missing', 'conflicting'].includes(question.exact_wording_status),
      `${question.code} exact wording cannot be marked confirmed without approved text`,
    );
    assert.equal(question.exact_wording, null, `${question.code} exact wording must remain empty`);
    assert.deepEqual(question.options, [], `${question.code} options must remain empty`);
    assert.deepEqual(question.scoring, [], `${question.code} scoring must remain empty`);
  }

  const evidenceIds = manifest.evidence_matrix.map((item) => item.id);
  assertUnique(evidenceIds, 'evidence ids');
  const evidence = evidenceById(manifest);
  for (const item of manifest.evidence_matrix) {
    assert.ok(allowedEvidenceStatuses.has(item.status), `invalid evidence status for ${item.id}`);
    assert.equal(typeof item.runtime_blocking, 'boolean');
    assert.ok(item.sources.length > 0, `${item.id} must cite at least one source`);
    for (const sourceId of item.sources) {
      assert.ok(sourceIds.includes(sourceId), `${item.id} references unknown source ${sourceId}`);
    }
    if (item.status === 'confirmed') {
      assert.notEqual(item.value, null, `${item.id} is confirmed but has no value`);
    }
    if (item.status === 'missing' || item.status === 'conflicting') {
      assert.equal(item.value, null, `${item.id} must not contain an inferred value`);
    }
  }

  const computedBlockers = manifest.evidence_matrix
    .filter((item) => item.runtime_blocking && item.status !== 'confirmed')
    .map((item) => item.id);
  assert.deepEqual(sorted(manifest.runtime_blockers), sorted(computedBlockers));
  assertUnique(manifest.runtime_blockers, 'runtime blockers');

  const exactWordingReady = evidence.get('exact_question_wording')?.status === 'confirmed';
  const optionsReady = evidence.get('exact_options_and_keys')?.status === 'confirmed';
  const scoringReady = evidence.get('scoring_contributions')?.status === 'confirmed';
  const resultCopyReady = evidence.get('official_result_copy')?.status === 'confirmed';
  const activationsReady = evidence.get('official_activation_matrix')?.status === 'confirmed';

  assert.equal(exactWordingReady, false);
  assert.equal(optionsReady, false);
  assert.equal(scoringReady, false);
  assert.equal(resultCopyReady, false);
  assert.equal(activationsReady, false);
  assert.equal(manifest.classification_policy, null);

  const canPublish = computedBlockers.length === 0;
  assert.equal(manifest.instrument.publishable, canPublish);
  assert.equal(manifest.publication.publish_allowed, canPublish);
  assert.equal(manifest.publication.preview_allowed, canPublish);
  assert.equal(manifest.publication.draft_allowed, true);
  assert.equal(manifest.instrument.lifecycle, canPublish ? 'published' : 'blocked');
  assert.ok(manifest.publication.reason, 'publication decision must be explained');

  return {
    status: 'valid',
    instrument_version: manifest.instrument.version,
    question_count: manifest.questions.length,
    dimension_count: manifest.dimensions.length,
    archetype_count: manifest.archetypes.length,
    runtime_blocker_count: computedBlockers.length,
    runtime_blockers: sorted(computedBlockers),
    publishable: canPublish,
  };
}

export async function loadAndValidateOfficialDiagnosticManifest(filePath = defaultManifestPath) {
  const manifest = JSON.parse(await readFile(filePath, 'utf8'));
  return validateOfficialDiagnosticManifest(manifest);
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  loadAndValidateOfficialDiagnosticManifest(process.argv[2] || defaultManifestPath)
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
