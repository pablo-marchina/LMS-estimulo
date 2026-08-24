import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  quickCheckAction,
  quickCheckForm,
  activityPage,
  diagnosticPage,
  diagnosticRuntime,
  diagnosticProfilePage,
  profileTabs,
  credentialsPage,
  carousel,
  globals,
  passwordField,
  contentViewer,
  pointRuleEditor,
  gamificationActions,
  productManagement,
  pointRuleMigration,
  pointRuleGrantMigration,
  participantFlowMigration,
  credentialIssuanceMigration,
  certificateRuleMigration,
  genericCertificateMigration,
  migrationBoundary,
  participantVisual,
  adminVisual,
] = await Promise.all([
  readFile("apps/web/app/actions/quick-check.ts", "utf8"),
  readFile("apps/web/components/quick-check-form.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/diagnostico/page.tsx", "utf8"),
  readFile("apps/web/lib/diagnostics/participant-runtime.ts", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/diagnostico/page.tsx", "utf8"),
  readFile("apps/web/components/participant-profile-tabs.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/conquistas/page.tsx", "utf8"),
  readFile("apps/web/components/announcement-carousel.tsx", "utf8"),
  readFile("apps/web/app/globals.css", "utf8"),
  readFile("apps/web/components/password-field.tsx", "utf8"),
  readFile("apps/web/components/content-asset-viewer.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/point-rule-editor.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/actions.ts", "utf8"),
  readFile("apps/web/lib/admin/product-management.ts", "utf8"),
  readFile("supabase/migrations/20260823133000_admin_point_rule_retirement.sql", "utf8"),
  readFile("supabase/migrations/20260823164000_harden_admin_point_rule_retirement_grants.sql", "utf8"),
  readFile("supabase/migrations/20260823213943_fix_participant_diagnostic_and_quick_check_flows.sql", "utf8"),
  readFile("supabase/migrations/20260824025507_issue_path_and_journey_completion_credentials.sql", "utf8"),
  readFile("supabase/migrations/20260824030432_fix_certificate_credential_rule_language.sql", "utf8"),
  readFile("supabase/migrations/20260824030855_enable_generic_certificates_for_participant_journeys.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
  readFile("scripts/e2e/participant-critical-flow-visual.mjs", "utf8"),
  readFile("scripts/e2e/admin-critical-flow-visual.mjs", "utf8"),
]);

test("quick-check submissions reconcile persisted state instead of surfacing a generic error page", () => {
  assert.match(quickCheckForm, /@\/app\/actions\/quick-check/u);
  assert.match(quickCheckAction, /QUICK_CHECK_START_RECONCILE/u);
  assert.match(quickCheckAction, /QUICK_CHECK_SUBMIT_RECONCILE/u);
  assert.match(quickCheckAction, /const persisted = latest\.assessment\?\.questions/u);
  assert.match(quickCheckAction, /avaliacao=erro/u);
  assert.doesNotMatch(quickCheckAction, /throw error/u);
  assert.match(activityPage, /Verificação preservada/u);
  assert.match(activityPage, /Sua resposta continua salva/u);
  assert.match(participantFlowMigration, /perform app_private\.e14_lock_scope\('point-credit\|' \|\| idem\)/u);
  assert.match(participantFlowMigration, /if found then[\s\S]*'replayed', true/u);
});

test("diagnostic entry is resolvable directly without starting the journey", () => {
  assert.match(diagnosticPage, /participantDiagnosticRuntime\.ensureEntry\(actor\)/u);
  assert.match(diagnosticPage, /entry\.next_path/u);
  assert.match(diagnosticPage, /Diagnóstico temporariamente indisponível/u);
  assert.match(diagnosticRuntime, /"e14_list_eligible_journeys"/u);
  assert.match(diagnosticRuntime, /candidate\.open_to_all/u);
  assert.match(diagnosticRuntime, /"e14_self_enroll"/u);
  assert.match(diagnosticRuntime, /diagnostic-context:\$\{actorUserAccountId\}:\$\{journey\.journey_version_id\}/u);
  assert.doesNotMatch(diagnosticPage, /redirect\("\/empreendedor\/jornadas"\)/u);
  assert.match(diagnosticProfilePage, /startProfileDiagnosticAction/u);
  assert.match(profileTabs, /\/empreendedor\/perfil\/diagnostico/u);
});

test("configured completion credentials are issued after final state and use compatible certificate rules", () => {
  assert.match(credentialIssuanceMigration, /create or replace function app_private\.issue_credentials_from_path_completed_state/u);
  assert.match(credentialIssuanceMigration, /after update of status on orchestration\.path_assignments/u);
  assert.match(credentialIssuanceMigration, /new\.status = 'completed'/u);
  assert.match(credentialIssuanceMigration, /perform public\.issue_learning_credentials/u);
  assert.match(credentialIssuanceMigration, /path-completed-state-v1:/u);
  assert.match(credentialIssuanceMigration, /path-completion-backfill-v1:/u);
  assert.match(credentialIssuanceMigration, /journey-completion-backfill-v1:/u);
  assert.match(certificateRuleMigration, /set language = 'credential-v1'/u);
  assert.match(certificateRuleMigration, /CERTIFICATE_REQUIREMENTS_RULE_LANGUAGE_INVALID/u);
  assert.match(certificateRuleMigration, /journey-certificate-rule-language-backfill-v1:/u);
  assert.match(genericCertificateMigration, /certificado_geral_estimulo/u);
  assert.match(genericCertificateMigration, /internal_test_only/u);
  assert.match(genericCertificateMigration, /publishable_to_real_participants/u);
  assert.match(genericCertificateMigration, /generic-journey-certificate-backfill-v1:/u);
  assert.match(credentialsPage, /credentialRuntime\.listParticipant/u);
  assert.match(credentialsPage, /credentials\?\.badges\.map/u);
  assert.match(credentialsPage, /credentials\?\.certificates\.map/u);
});

test("announcement artwork keeps the intended desktop and mobile aspect contracts", () => {
  assert.match(globals, /\.brand-carousel-slide \{[^}]*aspect-ratio:\s*8\s*\/\s*3/u);
  assert.match(carousel, /max-md:!aspect-\[4\/5\]/u);
  assert.match(carousel, /max-md:!aspect-\[8\/3\]/u);
  assert.match(carousel, /media="\(max-width: 767px\)"/u);
  assert.doesNotMatch(carousel, /sm:max-h-\[40vh\]/u);
});

test("password field keeps the reveal control centered without shrinking the input", () => {
  assert.match(passwordField, /grid w-full min-w-0/u);
  assert.match(passwordField, /relative block w-full/u);
  assert.match(passwordField, /w-full pr-12/u);
  assert.match(passwordField, /absolute right-2 top-1\/2/u);
  assert.match(passwordField, /-translate-y-1\/2/u);
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

test("point-rule retirement RPC is restricted to the service gateway", () => {
  assert.match(pointRuleGrantMigration, /revoke execute on function public\.retire_admin_point_rule\(uuid, uuid, uuid, text\) from public/u);
  assert.match(pointRuleGrantMigration, /from anon/u);
  assert.match(pointRuleGrantMigration, /from authenticated/u);
  assert.match(pointRuleGrantMigration, /grant execute on function public\.retire_admin_point_rule\(uuid, uuid, uuid, text\) to service_role/u);
});

test("release migration boundary includes participant and completion credential fixes", () => {
  assert.match(migrationBoundary, /expectedLastMigration = '20260824030855_enable_generic_certificates_for_participant_journeys\.sql'/u);
  assert.match(migrationBoundary, /'20260823133000_admin_point_rule_retirement\.sql'/u);
  assert.match(migrationBoundary, /'20260823164000_harden_admin_point_rule_retirement_grants\.sql'/u);
  assert.match(migrationBoundary, /'20260823213943_fix_participant_diagnostic_and_quick_check_flows\.sql'/u);
  assert.match(migrationBoundary, /'20260824025507_issue_path_and_journey_completion_credentials\.sql'/u);
  assert.match(migrationBoundary, /'20260824030432_fix_certificate_credential_rule_language\.sql'/u);
  assert.match(migrationBoundary, /'20260824030855_enable_generic_certificates_for_participant_journeys\.sql'/u);
  assert.match(participantFlowMigration, /create or replace function app_private\.e14_write_c4/u);
  assert.match(participantFlowMigration, /on conflict do nothing/u);
});

test("real participant visual gate checks login, banner, diagnostic and lesson follow-ups", () => {
  assert.match(participantVisual, /inspectLogin/u);
  assert.match(participantVisual, /login input width mismatch/u);
  assert.match(participantVisual, /password reveal control is not vertically centered/u);
  assert.match(participantVisual, /inspectHomeBanner/u);
  assert.match(participantVisual, /expected 8:3/u);
  assert.match(participantVisual, /expected 4:5/u);
  assert.match(participantVisual, /inspectDiagnosticEntry/u);
  assert.match(participantVisual, /sourceEscapeHatchPresent/u);
  assert.match(participantVisual, /lesson still exposes the generic Abrir na fonte action/u);
});

test("real admin visual gate checks point-rule description and retirement controls", () => {
  assert.match(adminVisual, /\/admin\/gamificacao\?tipo=pontos/u);
  assert.match(adminVisual, /checkPointRuleControls/u);
  assert.match(adminVisual, /descriptionFieldPresent/u);
  assert.match(adminVisual, /removalActionPresent/u);
  assert.match(adminVisual, /existing point rule does not expose the retirement action/u);
});
