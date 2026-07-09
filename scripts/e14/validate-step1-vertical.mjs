import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixtureUrl = new URL('../../docs/implementation/e14-step1-technical-vertical-v0.1.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const eventCatalogUrl = new URL('../../docs/events/EVENT_CATALOG_V0_1.md', import.meta.url);
const eventCatalog = await readFile(eventCatalogUrl, 'utf8');

assert.equal(fixture.openai_content_status, 'BLOCKED');
assert.equal(fixture.openai_delivery_credit, false);
assert.equal(fixture.visibility, 'internal_test_only');
assert.equal(fixture.journey.publishable_to_real_participants, false);
assert.equal(fixture.journey.partner_attribution, null);

assert.ok(fixture.diagnostic.questions.length >= 3 && fixture.diagnostic.questions.length <= 5);
assert.ok(fixture.diagnostic.dimensions.length >= 1 && fixture.diagnostic.dimensions.length <= 2);
assert.ok(fixture.diagnostic.questions.every((question) => question.required === true));
assert.ok(fixture.diagnostic.questions.every((question) => question.options.some((option) => option.uncertain === true)));
assert.equal(fixture.diagnostic.assignment_rule.fallback_path, 'guided');

const pathCodes = new Set(fixture.paths.map((path) => path.code));
assert.deepEqual(pathCodes, new Set(['guided', 'standard']));
for (const path of fixture.paths) {
  assert.equal(path.steps[0], 'welcome');
  assert.ok(path.steps.includes('diagnosis'));
  assert.ok(path.steps.includes('activity'));
  assert.ok(path.steps.includes('quick_check'));
  assert.equal(path.steps.at(-1), 'completion');
}

assert.ok(fixture.activity.title.length > 0);
assert.ok(fixture.activity.learning_objective.length > 0);
assert.ok(fixture.activity.estimated_duration_minutes > 0);
assert.ok(fixture.activity.content_sections.length >= 4);
assert.equal(fixture.activity.accessibility.text_first, true);
assert.equal(fixture.activity.accessibility.requires_video, false);
assert.equal(fixture.activity.authorization.real_participant_use_authorized, false);

const correctOptions = fixture.quick_check.options.filter((option) => option.correct === true);
assert.equal(correctOptions.length, 1);
assert.ok(fixture.quick_check.options.every((option) => option.feedback.length > 0));
assert.equal(fixture.quick_check.passing_score, 1);
assert.ok(fixture.quick_check.max_attempts >= 1);

assert.equal(fixture.completion_rule.time_spent_is_not_sufficient, true);
assert.ok(fixture.completion_rule.all_required.includes('assessment.attempt.passed'));
assert.ok(fixture.completion_rule.activity_completion_effects.includes('progress_percent=100'));

const maximumPoints = fixture.points.entries.reduce((sum, entry) => sum + entry.amount, 0);
assert.equal(maximumPoints, fixture.points.maximum_total_per_enrollment);
assert.equal(fixture.points.production_rule, false);
assert.equal(fixture.points.transferable_to_real_rewards, false);
assert.ok(fixture.points.entries.every((entry) => entry.idempotency_scope.length > 0));

const requiredEventSet = new Set(fixture.required_events);
assert.equal(requiredEventSet.size, fixture.required_events.length);
for (const event of requiredEventSet) {
  assert.ok(eventCatalog.includes(`\`${event}\``), `event not present in canonical catalog: ${event}`);
}
for (const event of [
  'catalog.journey_version.published',
  'journey.enrollment.created',
  'diagnostic.session.completed',
  'journey.path.assigned',
  'learning.activity.started',
  'assessment.attempt.passed',
  'learning.activity.completed',
  'engagement.points.awarded',
  'journey.instance.completed'
]) {
  assert.ok(requiredEventSet.has(event), `missing required event ${event}`);
}

assert.ok(fixture.explicit_limitations.length >= 5);
assert.ok(fixture.explicit_limitations.some((item) => item.includes('Não é conteúdo da Jornada OpenAI')));
assert.ok(fixture.explicit_limitations.some((item) => item.includes('crédito')));

console.log(JSON.stringify({
  status: 'ok',
  artifact: fixture.artifact,
  openai_content_status: fixture.openai_content_status,
  questions: fixture.diagnostic.questions.length,
  dimensions: fixture.diagnostic.dimensions.length,
  paths: fixture.paths.map((path) => path.code),
  content_sections: fixture.activity.content_sections.length,
  quick_check_options: fixture.quick_check.options.length,
  required_events: fixture.required_events.length,
  maximum_test_points: fixture.points.maximum_total_per_enrollment
}, null, 2));
