import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  quickCheckAction,
  quickCheckForm,
  activityPage,
  diagnosticPage,
  diagnosticProfilePage,
  profileTabs,
  carousel,
  globals,
  passwordField,
  contentViewer,
  pointRuleEditor,
  gamificationActions,
  productManagement,
  pointRuleMigration,
  migrationBoundary,
] = await Promise.all([
  readFile("apps/web/app/actions/quick-check.ts", "utf8"),
  readFile("apps/web/components/quick-check-form.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/diagnostico/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/diagnostico/page.tsx", "utf8"),
  readFile("apps/web/components/participant-profile-tabs.tsx", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/globals.css", "utf8"),
  readFile("apps/web/components/password-field.tsx", "utf8"),
  readFile("apps/web/components/content-asset-viewer.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/point-rule-editor.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/actions.ts", "utf8"),
  readFile("apps/web/lib/admin/product-management.ts", "utf8"),
  readFile("supabase/migrations/20260823133000_admin_point_rule_retirement.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
]);

test("quick-check submissions reconcile persisted state instead of surfacing a generic error page", () => {
  assert.match(quickCheckForm, /@\/app\/actions\/quick-check/u);
  assert.match(quickCheckAction, /QUICK_CHECK_START_RECONCILE/u);
  assert.match(quickCheckAction, /QUICK_CHECK_SUBMIT_RECONCILE/u);
  assert.match(quickCheckAction, /const persisted = latest\.assessment\?\.questions/u);
  assert.match(quickCheckAction, /avaliacao=erro/u);
  assert.doesNotMatch(quickCheckAction, /throw error/u);
  assert.match(activityPage, /assessmentMessages/u);
});

test("diagnostic entry is resolvable directly and remains reachable from the participant profile", () => {
  assert.match(diagnosticPage, /participantDiagnosticRuntime\.resolveEntry\(actor\)/u);
  assert.match(diagnosticPage, /entry\.next_path/u);
  assert.match(diagnosticPage, /Diagnóstico temporariamente indisponível/u);
  assert.match(diagnosticProfilePage, /startProfileDiagnosticAction/u);
  assert.match(profileTabs, /\/empreendedor\/perfil\/diagnostico/u);
});

test("announcement artwork keeps the intended desktop and mobile aspect contracts", () => {
  assert.match(globals, /\.brand-carousel-slide \{[^}]*aspect-ratio:\s*8\s*\/\s*3/u);
  assert.match(carousel, /max-md:!aspect-\[4\/5\]/u);
  assert.match(carousel, /max-md:!aspect-\[8\/3\]/u);
  assert.match(carousel, /media="\(max-width: 767px\)"/u);
  assert.doesNotMatch(carousel, /sm:max-h-\[40vh\]/u);
});

test("password field keeps the reveal control centered without shrinking the input", () => {
  assert.match(passwordField, /relative block w-full/u);
  assert.match(passwordField, /pr-12/u);
  assert.match(passwordField, /absolute inset-y-0 right-1/u);
  assert.match(passwordField, /my-1 grid w-10/u);
});

test("embedded lesson media no longer exposes the generic source escape hatch", () => {
  assert.doesNotMatch(contentViewer, /Abrir na fonte/u);
  assert.match(contentViewer, /isDirectExternalContent/u);
  assert.match(contentViewer, /externalUrl && isDirectExternalContent/u);
  assert.match(contentViewer, /Acessar conteúdo/u);
});

test("point-rule descriptions are editable and retirement is auditable without deleting history", () => {
  assert.match(pointRuleEditor, /Descrição mostrada ao participante/u);
  assert.match(pointRuleEditor, /name="description"/u);
  assert.match(pointRuleEditor, /retirePointRuleAction/u);
  assert.match(pointRuleEditor, /Remover pontuação desta ação/u);
  assert.match(gamificationActions, /resourceType: "point_rule_retire"/u);
  assert.match(productManagement, /"point_rule_retire"/u);
  assert.match(pointRuleMigration, /create or replace function public\.retire_admin_point_rule/u);
  assert.match(pointRuleMigration, /set status = 'retired'/u);
  assert.match(pointRuleMigration, /previous_value/u);
  assert.match(pointRuleMigration, /new_value/u);
  assert.doesNotMatch(pointRuleMigration, /delete from engagement\.point_/u);
  assert.doesNotMatch(pointRuleMigration, /updated_at/u);
});

test("release migration boundary includes the point-rule retirement migration", () => {
  assert.match(migrationBoundary, /expectedLastMigration = '20260823133000_admin_point_rule_retirement\.sql'/u);
  assert.match(migrationBoundary, /'20260823133000_admin_point_rule_retirement\.sql'/u);
});
