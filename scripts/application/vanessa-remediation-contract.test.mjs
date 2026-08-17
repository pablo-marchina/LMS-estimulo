import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  diagnosticBuilder,
  diagnosticActions,
  diagnosticResult,
  profileAchievements,
  journeyPage,
  journeyActions,
  certificateEditor,
  certificateTemplates,
  certificatePreviewRoute,
  gamificationPage,
  pointEditor,
  gamificationActions,
  badgeEditor,
  legalMigration,
  openLessonsMigration,
  certificateRulesMigration,
  rewardMigration,
  badgeMigration,
  pointEligibilityMigration,
  completeRemediationMigration,
  completionCtaMigration,
  progressReferenceMigration,
  pointAwardReplayMigration,
  migrationBoundary,
] = await Promise.all([
  readFile("apps/web/app/admin/diagnostico/diagnostic-builder.tsx", "utf8"),
  readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8"),
  readFile("apps/web/components/diagnostic-result-dashboard.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/perfil/conquistas/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts", "utf8"),
  readFile("apps/web/app/admin/gamificacao/certificate-editor.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/certificate-template-manager.tsx", "utf8"),
  readFile("apps/web/app/api/certificate-template-previews/[fileObjectId]/route.ts", "utf8"),
  readFile("apps/web/app/admin/gamificacao/page.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/point-rule-editor.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/actions.ts", "utf8"),
  readFile("apps/web/app/admin/gamificacao/badge-editor.tsx", "utf8"),
  readFile("supabase/migrations/20260815194105_restore_operational_legal_documents_and_harden_rls.sql", "utf8"),
  readFile("supabase/migrations/20260815194313_enforce_open_participant_lessons.sql", "utf8"),
  readFile("supabase/migrations/20260815200021_align_certificate_rules_to_journeys.sql", "utf8"),
  readFile("supabase/migrations/20260815202049_automatic_reward_points_live_alignment.sql", "utf8"),
  readFile("supabase/migrations/20260815203254_rebind_orphaned_path_badges_to_current_tracks.sql", "utf8"),
  readFile("supabase/migrations/20260815203650_canonical_point_rule_eligibility.sql", "utf8"),
  readFile("supabase/migrations/20260816011759_complete_vanessa_video_remediation.sql", "utf8"),
  readFile("supabase/migrations/20260816012301_participant_lesson_completion_cta.sql", "utf8"),
  readFile("supabase/migrations/20260816012704_fix_completion_progress_current_step_reference.sql", "utf8"),
  readFile("supabase/migrations/20260816031000_restore_live_point_award_function.sql", "utf8"),
  readFile("scripts/database/migration-history/active-release-boundary.mjs", "utf8"),
]);

test("signup legal restoration is governed, replay-safe and fail-closed", () => {
  assert.match(legalMigration, /enable row level security/u);
  assert.match(legalMigration, /revoke all privileges on table governance\.legal_document_versions/u);
  assert.match(legalMigration, /revoke all privileges on table governance\.legal_acceptances/u);
  assert.match(legalMigration, /e14\.operator@invalid\.example/u);
  assert.match(legalMigration, /require_reacceptance/u);
  assert.match(legalMigration, /false/u);
});

test("all lessons are open by database invariant and participant CTAs use the dedicated lesson route", () => {
  assert.match(openLessonsMigration, /before insert or update of status on orchestration\.step_instances/u);
  assert.match(openLessonsMigration, /if new\.status = 'locked'/u);
  assert.match(openLessonsMigration, /new\.status := 'available'/u);
  assert.match(completeRemediationMigration, /open_all_paths/u);
  assert.match(completeRemediationMigration, /ensure_participant_open_paths/u);
  assert.match(journeyActions, /redirect\(`\/empreendedor\/atividade\/\$\{stepInstanceId\}\?journey=\$\{journeyInstanceId\}`\)/u);
  assert.match(journeyPage, /redirect\(`\/empreendedor\/atividade\/\$\{selectedActivity\.step_instance_id\}/u);
  assert.doesNotMatch(journeyPage, /<ActivityWorkspaceFrame>/u);
  assert.doesNotMatch(journeyPage, /<ActivityPage/u);
  assert.doesNotMatch(journeyPage, /id="aula"/u);
});

test("external certificate form stays behind the explicit participant CTA", () => {
  assert.match(profileAchievements, /<details/u);
  assert.match(profileAchievements, /Adicione seu certificado/u);
  assert.match(profileAchievements, /open=\{query\.certificadoExterno === "erro"\}/u);
  assert.match(profileAchievements, /grid gap-4 sm:grid-cols-2/u);
});

test("certificate templates persist a private preview and remain reusable", () => {
  assert.match(certificateTemplates, /Visualizar arquivo/u);
  assert.match(certificateTemplates, /Usar este arquivo/u);
  assert.match(certificateTemplates, /Usar como modelo geral/u);
  assert.match(certificateTemplates, /Usar no programa/u);
  assert.match(certificateTemplates, /Usar na jornada/u);
  assert.match(certificatePreviewRoute, /certificateTemplatePreviewDownload/u);
  assert.match(certificatePreviewRoute, /organization_id/u);
  assert.match(certificatePreviewRoute, /private, max-age=300/u);
  assert.doesNotMatch(certificatePreviewRoute, /cache-control[^\n]*public/u);
  assert.match(completeRemediationMigration, /uq_certificate_template_assignments_active_scope/u);
});

test("certificate rule selection is scoped by journey in UI and enforced in database", () => {
  assert.match(certificateEditor, /compatibleRules/u);
  assert.match(certificateEditor, /selectedRuleIsCompatible/u);
  assert.match(certificateEditor, /setRequirementsRuleVersionId/u);
  assert.match(certificateEditor, /Ao trocar de jornada, uma condição incompatível é removida automaticamente/u);
  assert.match(certificateRulesMigration, /validate_certificate_journey_rule/u);
  assert.match(certificateRulesMigration, /CERTIFICATE_REQUIREMENTS_RULE_JOURNEY_MISMATCH/u);
});

test("diagnostic result content belongs to profile state and is persisted as version configuration", () => {
  assert.match(diagnosticBuilder, /profileResultContent/u);
  assert.match(diagnosticBuilder, /setProfileResultContent/u);
  assert.match(diagnosticBuilder, /value=\{value\[section\.key\]\.title\}/u);
  assert.match(diagnosticBuilder, /value=\{value\[section\.key\]\.body\}/u);
  assert.doesNotMatch(diagnosticBuilder, /profile_result_[^\n]+defaultValue=/u);
  assert.match(diagnosticActions, /result_content: resultContent/u);
  assert.match(diagnosticResult, /normalizeDiagnosticProfileResultContent\(resultContent\)/u);
  assert.match(completeRemediationMigration, /result_content/u);
});

test("point configuration exposes domain choices only and resolves eligibility server-side", () => {
  assert.doesNotMatch(pointEditor, /name="eligibility_rule_version_id"/u);
  assert.match(pointEditor, /A regra técnica de elegibilidade é vinculada automaticamente/u);
  assert.match(pointEditor, /Qual avaliação dispara esta regra/u);
  assert.match(pointEditor, /O servidor salva os códigos da aula e da trilha juntos/u);
  assert.match(gamificationActions, /general_point_eligibility/u);
  assert.match(gamificationActions, /eligibility_rule_version_id: String\(eligibilityVersion\.id\)/u);
  assert.match(gamificationActions, /POINT_ASSESSMENT_TARGET_REQUIRED/u);
  assert.match(gamificationActions, /trigger_activity_code/u);
  assert.match(gamificationActions, /trigger_path_code/u);
  assert.match(rewardMigration, /trg_credit_reward_wallet_from_point_ledger/u);
  assert.match(rewardMigration, /trg_block_manual_reward_conversion/u);
  assert.match(pointEligibilityMigration, /general_point_eligibility/u);
  assert.match(completeRemediationMigration, /ranked_complete_lesson_rules/u);
  assert.match(completeRemediationMigration, /row_number\(\) over/u);
  assert.match(completeRemediationMigration, /trigger,event_name/u);
  assert.match(completeRemediationMigration, /learning\.activity\.completed/u);
  assert.match(completeRemediationMigration, /set\s+status\s*=\s*'retired'/u);
  assert.match(completeRemediationMigration, /publication_rank\s*>\s*1/u);
});

test("participant lesson completion is explicit, guarded and emits the canonical completion event", () => {
  assert.match(completionCtaMigration, /complete_participant_activity/u);
  assert.match(completionCtaMigration, /REQUIRED_CONTENT_INCOMPLETE/u);
  assert.match(completionCtaMigration, /ASSESSMENT_NOT_PASSED/u);
  assert.match(completionCtaMigration, /PRACTICE_COMPLETION_MANAGED_BY_REVIEW/u);
  assert.match(completionCtaMigration, /learning\.activity\.completed/u);
  assert.match(progressReferenceMigration, /candidate_step\.id/u);
});

test("point award replay restores the hardened live function", () => {
  assert.match(pointAwardReplayMigration, /award_participant_action_points/u);
  assert.match(pointAwardReplayMigration, /p_journey_instance_id/u);
  assert.doesNotMatch(pointAwardReplayMigration, /where\s+ji\.id\s*=\s*p_journey_instance(?!_id)/u);
  assert.match(pointAwardReplayMigration, /JOURNEY_INSTANCE_NOT_AVAILABLE/u);
  assert.match(pointAwardReplayMigration, /definition\.owner_organization_id\s*=\s*v_org/u);
});

test("badge and certificate rule lists are derived from current domain entities, not names", () => {
  assert.match(gamificationPage, /activePathIds/u);
  assert.match(gamificationPage, /activeJourneyVersionIds/u);
  assert.match(gamificationPage, /rule\.ruleType === "credential"/u);
  assert.doesNotMatch(gamificationPage, /Task\\b/u);
  assert.doesNotMatch(gamificationPage, /E14\\b/u);
  assert.match(badgeEditor, /Regras internas, testes e referências órfãs não aparecem/u);
  assert.match(badgeMigration, /ORPHANED_BADGE_PATH_MAPPING_AMBIGUOUS/u);
});

test("migration release boundary includes the audited structural migrations", () => {
  assert.match(migrationBoundary, /20260815194105_restore_operational_legal_documents_and_harden_rls\.sql/u);
  assert.match(migrationBoundary, /20260815194313_enforce_open_participant_lessons\.sql/u);
  assert.match(migrationBoundary, /20260815200021_align_certificate_rules_to_journeys\.sql/u);
  assert.match(migrationBoundary, /20260815202049_automatic_reward_points_live_alignment\.sql/u);
  assert.match(migrationBoundary, /20260815203254_rebind_orphaned_path_badges_to_current_tracks\.sql/u);
  assert.match(migrationBoundary, /20260815203650_canonical_point_rule_eligibility\.sql/u);
  assert.match(migrationBoundary, /20260816011759_complete_vanessa_video_remediation\.sql/u);
  assert.match(migrationBoundary, /20260816012301_participant_lesson_completion_cta\.sql/u);
  assert.match(migrationBoundary, /20260816012704_fix_completion_progress_current_step_reference\.sql/u);
  assert.match(migrationBoundary, /20260816031000_restore_live_point_award_function\.sql/u);
  assert.match(migrationBoundary, /20260816035500_scope_quick_activity_points_per_assessment\.sql/u);
  assert.match(migrationBoundary, /expectedLastMigration = '20260816035500_scope_quick_activity_points_per_assessment\.sql'/u);
});
