import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  productPage,
  journeyAction,
  libraryPage,
  activityFields,
  activityActions,
  quickPanel,
  activityPage,
  journeyPage,
  resultPage,
  viewer,
  gateway,
  migration,
  health,
] = await Promise.all([
  read("apps/web/app/admin/produto/page.tsx"),
  read("apps/web/app/admin/produto/journey-action.ts"),
  read("apps/web/app/admin/biblioteca/page.tsx"),
  read("apps/web/app/admin/produto/activity-content-fields.tsx"),
  read("apps/web/app/admin/produto/actions.ts"),
  read("apps/web/components/quick-check-panel.tsx"),
  read("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx"),
  read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
  read("apps/web/app/empreendedor/resultado/page.tsx"),
  read("apps/web/components/content-asset-viewer.tsx"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("supabase/migrations/20260727114500_flexible_quick_checks_and_library_asset_projection.sql"),
  read("apps/web/app/api/health/ready/route.ts"),
]);

test("every journey exposes clear square and featured background customization", () => {
  assert.match(productPage, /Imagem quadrada/u);
  assert.match(productPage, /1200 × 1200/u);
  assert.match(productPage, /Imagem ampla/u);
  assert.match(productPage, /1920 × 900/u);
  assert.match(productPage, /As mesmas opções valem para toda jornada/u);
  assert.match(journeyAction, /card_background_file_object_id/u);
  assert.match(journeyAction, /featured_background_file_object_id/u);
});

test("admin content workflow is library-first and concise", () => {
  assert.match(libraryPage, /Cadastre uma vez e use o mesmo conteúdo/u);
  assert.match(libraryPage, /Detalhes opcionais/u);
  assert.match(activityFields, /Usar da Biblioteca/u);
  assert.match(activityFields, /Criar agora na Biblioteca/u);
  assert.match(activityActions, /attachLibraryContentToActivity/u);
  assert.match(activityActions, /createInlineLibraryContent/u);
});

test("quick checks support open and objective formats", () => {
  assert.match(quickPanel, /Resposta aberta/u);
  assert.match(quickPanel, /multiple_choice/u);
  assert.match(activityActions, /multiple_choice/u);
  assert.match(activityActions, /open_text/u);
  assert.match(migration, /question_count/u);
  assert.match(migration, /answer_count/u);
  assert.match(migration, /passing_score/u);
});

test("participant content keeps media fallback and removes redundant reading labels", () => {
  assert.match(viewer, /videoseries/u);
  assert.match(viewer, /Abrir na fonte/u);
  assert.match(viewer, /Carregando vídeo/u);
  assert.doesNotMatch(activityPage, /Leitura guiada/u);
  assert.doesNotMatch(activityPage, /Ideias essenciais/u);
});

test("recognition follows the journey map and diagnostic uses radar", () => {
  assert.ok(journeyPage.indexOf("Trilhas e atividades") < journeyPage.indexOf("O que esta jornada pode liberar"));
  assert.match(resultPage, /DiagnosticDimensionChart/u);
  assert.match(resultPage, /Diagnóstico empreendedor/u);
});

test("gateway and readiness protect a public release", () => {
  assert.match(gateway, /attach_library_content_to_activity/u);
  assert.match(gateway, /get_journey_cover_download/u);
  assert.match(health, /NEXT_PUBLIC_APP_URL/u);
  assert.match(health, /NEXT_PUBLIC_SUPABASE_URL/u);
  assert.match(health, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.match(health, /get_application_readiness/u);
});
