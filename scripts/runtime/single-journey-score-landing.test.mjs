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
  assert.match(lifecycleMigration, /v_status:='draft'/);
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
    '20260731221600_filter_public_landing_journey.sql',
    '20260731221700_behavior_score_fk_indexes.sql',
    '20260731221800_secure_public_landing_rpc.sql',
  ]);
});

test('participant preview is isolated and navigation has progress feedback', async () => {
  const [guard, shell, layout, progress] = await Promise.all([
    read('apps/web/components/interface-preview-guard.tsx'),
    read('apps/web/components/participant-shell.tsx'),
    read('apps/web/app/layout.tsx'),
    read('apps/web/components/navigation-feedback.tsx'),
  ]);

  assert.match(guard, /interface_preview/);
  assert.match(guard, /preventSubmit/);
  assert.match(guard, /window\.fetch/);
  assert.match(guard, /XMLHttpRequest/);
  assert.match(guard, /sendBeacon/);
  assert.match(shell, /InterfacePreviewGuard/);
  assert.match(layout, /NavigationFeedback/);
  assert.match(progress, /role="progressbar"/);
});

test('behavior score is editable, continuous, indexed and ETL ready', async () => {
  const [schema, calculation, integration, indexes, editor] = await Promise.all([
    read('supabase/migrations/20260731221200_behavior_score_configuration_schema.sql'),
    read('supabase/migrations/20260731221300_behavior_score_calculation.sql'),
    read('supabase/migrations/20260731221400_behavior_score_runtime_integration.sql'),
    read('supabase/migrations/20260731221700_behavior_score_fk_indexes.sql'),
    read('apps/web/components/behavior-score-editor.tsx'),
  ]);

  assert.match(schema, /behavior_score_configurations/);
  assert.match(schema, /validate_behavior_score_configuration/);
  assert.match(calculation, /recalculate_behavior_scores/);
  assert.match(calculation, /behavior_score_history/);
  assert.match(integration, /p_action='behavior_event'/);
  assert.match(integration, /behavior_score_etl/);
  assert.match(indexes, /ix_behavior_score_history_configuration/);
  assert.match(indexes, /ix_behavior_score_snapshots_score_version/);
  assert.match(editor, /Dimensões e pesos/);
  assert.match(editor, /Faixas de classificação/);
});

test('landing uses the approved copy and a secured edge projection', async () => {
  const [landing, publicJourneyMigration, filterMigration, securityMigration, edgeFunction] = await Promise.all([
    read('apps/web/app/page.tsx'),
    read('supabase/migrations/20260731221500_public_landing_journey.sql'),
    read('supabase/migrations/20260731221600_filter_public_landing_journey.sql'),
    read('supabase/migrations/20260731221800_secure_public_landing_rpc.sql'),
    read('supabase/functions/public-landing-journey/index.ts'),
  ]);

  assert.match(landing, /Parceria Estímulo \+ OpenAI/);
  assert.match(landing, /ChatGPT para o seu negócio/);
  assert.match(landing, /Começar gratuitamente/);
  assert.match(landing, /O que você vai aprender/);
  assert.match(landing, /GANHE PONTOS/);
  assert.match(landing, /Dúvidas rápidas/);
  assert.match(landing, /href="\/cadastro"/);
  assert.match(landing, /href="\/entrar"/);
  assert.doesNotMatch(landing, /Seu negócio evolui\. A forma de aprender também\./);
  assert.doesNotMatch(landing, /CURSO EM DESTAQUE/iu);
  assert.match(publicJourneyMigration, /get_public_landing_journey/);
  assert.match(publicJourneyMigration, /jv\.status='published'/);
  assert.match(filterMigration, /not like '%openai%'/i);
  assert.match(securityMigration, /grant execute on function public\.get_public_landing_journey\(\) to service_role/);
  assert.match(securityMigration, /revoke all .* from public,anon,authenticated/);
  assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edgeFunction, /METHOD_NOT_ALLOWED/);
});
