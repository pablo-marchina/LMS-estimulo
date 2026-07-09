import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureUrl = new URL('../../docs/implementation/e14-step1-technical-vertical-v0.1.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const eventCatalogUrl = new URL('../../docs/events/EVENT_CATALOG_V0_1.md', import.meta.url);
const eventCatalog = await readFile(eventCatalogUrl, 'utf8');

function assignPath(answerCodes) {
  let uncertain = 0;
  const scores = { tool_familiarity: 0, review_autonomy: 0 };
  for (const question of fixture.diagnostic.questions) {
    const optionCode = answerCodes[question.code];
    const option = question.options.find((candidate) => candidate.code === optionCode);
    assert.ok(option, `missing valid answer for ${question.code}`);
    scores[question.dimension] += option.score;
    if (option.uncertain) uncertain += 1;
  }
  const lowConfidence = uncertain >= 2;
  const guided = lowConfidence || scores.tool_familiarity <= 2 || scores.review_autonomy <= 2;
  return { path: guided ? 'guided' : 'standard', lowConfidence, scores };
}

test('atribui standard quando ambas as dimensões têm evidência suficiente', () => {
  const result = assignPath({
    q1_digital_assistant_frequency: 'frequently',
    q2_follow_instructions: 'independent',
    q3_identify_components: 'yes',
    q4_review_output: 'always'
  });
  assert.deepEqual(result, {
    path: 'standard',
    lowConfidence: false,
    scores: { tool_familiarity: 4, review_autonomy: 4 }
  });
});

test('atribui guided quando uma dimensão está no limiar inferior', () => {
  const result = assignPath({
    q1_digital_assistant_frequency: 'sometimes',
    q2_follow_instructions: 'some_support',
    q3_identify_components: 'yes',
    q4_review_output: 'always'
  });
  assert.equal(result.path, 'guided');
  assert.equal(result.lowConfidence, false);
  assert.equal(result.scores.tool_familiarity, 2);
});

test('baixa confiança sempre usa fallback guided', () => {
  const result = assignPath({
    q1_digital_assistant_frequency: 'unknown',
    q2_follow_instructions: 'unknown',
    q3_identify_components: 'yes',
    q4_review_output: 'always'
  });
  assert.equal(result.path, 'guided');
  assert.equal(result.lowConfidence, true);
});

test('quick check possui exatamente uma resposta correta e feedback completo', () => {
  assert.equal(fixture.quick_check.options.filter((option) => option.correct).length, 1);
  assert.ok(fixture.quick_check.options.every((option) => option.feedback.length > 0));
});

test('pontos são idempotentes, limitados e exclusivamente técnicos', () => {
  const total = fixture.points.entries.reduce((sum, entry) => sum + entry.amount, 0);
  assert.equal(total, 7);
  assert.equal(total, fixture.points.maximum_total_per_enrollment);
  assert.equal(fixture.points.production_rule, false);
  assert.equal(fixture.points.transferable_to_real_rewards, false);
  assert.ok(fixture.points.entries.every((entry) => entry.idempotency_scope));
});

test('todos os eventos usados existem no catálogo canônico', () => {
  for (const event of fixture.required_events) {
    assert.ok(eventCatalog.includes(`\`${event}\``), `evento ausente: ${event}`);
  }
});
