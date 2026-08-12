import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

const scoreMigration = await read('supabase/migrations/20260802180651_behavior_scoring_and_admin_crm_controls.sql');
const scoreRuntimeMigration = await read('supabase/migrations/20260804173000_continuous_behavior_scoring_and_event_etl.sql');
const integration = await read('apps/web/lib/integrations/events/runtime.ts');
const indexes = await read('supabase/migrations/20260804184500_behavior_score_indexes.sql');
const editor = await read('apps/web/components/behavior-score-editor.tsx');

test('behavior score is versioned and configurable', () => {
  assert.match(scoreMigration, /behavior_score_configurations/);
  assert.match(scoreMigration, /behavior_score_snapshots/);
  assert.match(scoreRuntimeMigration, /recalculate_behavior_score/);
  assert.match(scoreRuntimeMigration, /behavior_score_etl/);
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

  assert.match(landing, /Seu negócio evolui\. A forma de aprender também\./);
  assert.match(landing, /Conhecimento que vira resultado no seu negócio\./);
  assert.match(landing, /Cada empreendedor aprende de um jeito\./);
  assert.match(landing, /O que você encontra na plataforma/);
  assert.match(landing, /Criar conta gratuitamente/);
  assert.match(landing, /Conteúdos práticos, ferramentas e jornadas com parceiros como a OpenAI para apoiar seu crescimento\./);
  assert.doesNotMatch(landing, /Conhecer o curso/);
  assert.doesNotMatch(landing, /CURSO EM DESTAQUE/iu);
  assert.match(publicJourneyMigration, /get_public_landing_journey/);
  assert.match(publicJourneyMigration, /jv\.status='published'/);
  assert.match(filterMigration, /not like '%openai%'/i);
  assert.match(securityMigration, /grant execute on function public\.get_public_landing_journey\(\) to service_role/);
  assert.match(securityMigration, /revoke all .* from public,anon,authenticated/);
  assert.match(edgeFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edgeFunction, /METHOD_NOT_ALLOWED/);
});
