import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('journeys have a single operational record and two visible states', async () => {
  const [historyMigration, lifecycleMigration] = await Promise.all([
    read('supabase/migrations/20260731221000_remove_journey_version_history.sql'),
    read('supabase/migrations/20260731221100_single_journey_lifecycle.sql'),
  ]);

  assert.match(historyMigration, /uq_catalog_single_journey_per_definition/);
  assert.match(historyMigration, /check\(version_number=1\)/);
  assert.match(lifecycleMigration, /v_status='draft'/);
  assert.match(lifecycleMigration, /jv\.status in \('draft','published'\)/);
  assert.match(lifecycleMigration, /status='cancelled'/);
  assert.match(lifecycleMigration, /drop function if exists public\.create_admin_journey_draft_from_version/);
  assert.doesNotMatch(lifecycleMigration, /max\(version_number\)/);
});

test('new migrations have unique ordered versions', async () => {
  const files = (await readdir(path.join(root, 'supabase/migrations')))
    .filter((file) => /^2026073122\d{4}_[a-z0-9_]+\.sql$/.test(file))
    .sort();
  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length);
  assert.deepEqual(files, [
    '20260731221000_remove_journey_version_history.sql',
    '20260731221100_single_journey_lifecycle.sql',
    '20260731221200_behavior_score_configuration_schema.sql',
    '20260731221300_behavior_score_calculation.sql',
    '20260731221400_behavior_score_runtime_integration.sql',
    '20260731221500_public_landing_journey.sql',
  ]);
});

test('participant preview is isolated and navigation has progress feedback', async () => {
  const [guard, shell, progress] = await Promise.all([
    read('apps/web/components/interface-preview-guard.tsx'),
    read('apps/web/components/participant-shell.tsx'),
    read('apps/web/components/participant-navigation-progress.tsx'),
  ]);

  assert.match(guard, /interface_preview/);
  assert.match(guard, /preventSubmit/);
  assert.match(guard, /window\.fetch/);
  assert.match(guard, /XMLHttpRequest/);
  assert.match(guard, /sendBeacon/);
  assert.match(shell, /InterfacePreviewGuard/);
  assert.match(shell, /ParticipantNavigationProgress/);
  assert.match(progress, /role="progressbar"/);
});

test('behavior score is editable, continuous and ETL ready', async () => {
  const [schema, calculation, integration, editor] = await Promise.all([
    read('supabase/migrations/20260731221200_behavior_score_configuration_schema.sql'),
    read('supabase/migrations/20260731221300_behavior_score_calculation.sql'),
    read('supabase/migrations/20260731221400_behavior_score_runtime_integration.sql'),
    read('apps/web/components/behavior-score-editor.tsx'),
  ]);

  assert.match(schema, /behavior_score_configurations/);
  assert.match(schema, /validate_behavior_score_configuration/);
  assert.match(calculation, /recalculate_behavior_scores/);
  assert.match(calculation, /behavior_score_history/);
  assert.match(integration, /p_action='behavior_event'/);
  assert.match(integration, /behavior_score_etl/);
  assert.match(editor, /Dimensões e pesos/);
  assert.match(editor, /Faixas de classificação/);
});

test('landing uses the approved copy and no OpenAI promotion', async () => {
  const landing = await read('apps/web/app/page.tsx');
  const publicJourneyMigration = await read('supabase/migrations/20260731221500_public_landing_journey.sql');

  assert.match(landing, /Seu negócio evolui\. A forma de aprender também\./);
  assert.match(landing, /Conhecimento que vira resultado no seu negócio\./);
  assert.match(landing, /Cada empreendedor aprende de um jeito\./);
  assert.match(landing, /O que você encontra na plataforma/);
  assert.match(landing, /Criar conta gratuitamente/);
  assert.match(landing, /Conhecer o curso/);
  assert.doesNotMatch(landing, /OpenAI/i);
  assert.match(publicJourneyMigration, /get_public_landing_journey/);
  assert.match(publicJourneyMigration, /jv\.status='published'/);
});