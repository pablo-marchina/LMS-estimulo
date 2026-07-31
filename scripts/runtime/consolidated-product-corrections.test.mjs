import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("participant authentication exposes password recovery and accessible visibility controls", async () => {
  const [login, signup, field, requestAction, callback, updateAction] = await Promise.all([
    source("apps/web/app/entrar/page.tsx"),
    source("apps/web/app/cadastro/page.tsx"),
    source("apps/web/components/password-field.tsx"),
    source("apps/web/app/recuperar-senha/actions.ts"),
    source("apps/web/app/auth/password-recovery/route.ts"),
    source("apps/web/app/redefinir-senha/actions.ts"),
  ]);

  assert.match(login, /href="\/recuperar-senha"/u);
  assert.match(login, /Sou da equipe Estímulo/u);
  assert.match(signup, /terms_version/u);
  assert.match(signup, /href="\/privacidade"/u);
  assert.match(field, /useState\(true\)/u);
  assert.match(field, /aria-label=\{visible \? "Ocultar senha" : "Mostrar senha"\}/u);
  assert.match(requestAction, /resetPasswordForEmail/u);
  assert.match(callback, /exchangeCodeForSession/u);
  assert.match(callback, /type: "recovery"/u);
  assert.match(updateAction, /updateUser\(\{ password:/u);
});

test("diagnostic completion persists answers, result navigation and transactional idempotent points", async () => {
  const [page, stepper, action, result, pointRuleMigration, reconciliation, atomicMigration, gateway] = await Promise.all([
    source("apps/web/app/empreendedor/diagnostico/page.tsx"),
    source("apps/web/components/diagnostic-stepper.tsx"),
    source("apps/web/app/empreendedor/diagnostico/actions.ts"),
    source("apps/web/app/empreendedor/resultado/page.tsx"),
    source("supabase/migrations/20260730020728_complete_diagnostic_point_rule.sql"),
    source("supabase/migrations/20260730113000_normalize_diagnostic_point_rule_eligibility.sql"),
    source("supabase/migrations/20260730130000_atomic_diagnostic_completion_points.sql"),
    source("supabase/functions/authenticated-rpc/index.ts"),
  ]);

  assert.match(page, /DiagnosticStepper/u);
  assert.match(stepper, /Pergunta \{currentIndex \+ 1\} de \{items.length\}/u);
  assert.match(action, /recordDiagnosticResponse/u);
  assert.match(action, /complete_participant_diagnostic_with_points/u);
  assert.doesNotMatch(action, /journeyRuntime\.completeDiagnostic/u);
  assert.match(action, /p_completion_idempotency_key/u);
  assert.match(action, /p_points_idempotency_key/u);
  assert.match(action, /\/empreendedor\/resultado\?journey=/u);
  assert.match(result, /diagnostico === "concluido"/u);
  assert.match(pointRuleMigration, /e14_always_eligible/u);
  assert.match(pointRuleMigration, /'maximum', 1/u);
  assert.match(pointRuleMigration, /diagnostic\.session\.completed/u);
  assert.match(reconciliation, /COMPLETE_DIAGNOSTIC_POINT_RULE_VERSION_NOT_FOUND/u);
  assert.match(reconciliation, /e14_always_eligible/u);
  assert.match(atomicMigration, /for update/u);
  assert.match(atomicMigration, /e14_entrepreneur_for_account/u);
  assert.match(atomicMigration, /DIAGNOSTIC_JOURNEY_MISMATCH/u);
  assert.match(atomicMigration, /v_session_status = 'completed'/u);
  assert.match(atomicMigration, /public\.e14_complete_diagnostic/u);
  assert.match(atomicMigration, /public\.award_participant_action_points/u);
  assert.match(atomicMigration, /revoke all .* from public, anon, authenticated/iu);
  assert.match(gateway, /complete_participant_diagnostic_with_points/u);
});

test("certificate wallet and templates remain discoverable after upload", async () => {
  const [upload, page, runtime, migration, editor] = await Promise.all([
    source("apps/web/app/api/external-credential-uploads/route.ts"),
    source("apps/web/app/admin/gamificacao/page.tsx"),
    source("apps/web/lib/credentials/extended-runtime.ts"),
    source("supabase/migrations/20260730021001_operator_certificate_template_catalog.sql"),
    source("apps/web/app/admin/gamificacao/certificate-editor.tsx"),
  ]);

  assert.match(upload, /waitForProjection/u);
  assert.match(upload, /\[0, 100, 250, 500\]/u);
  assert.match(runtime, /list_operator_certificate_templates/u);
  assert.match(migration, /metadata->>'category' = 'certificate_template'/u);
  assert.match(page, /Templates salvos/u);
  assert.match(editor, /Template salvo/u);
});

test("administrative destructive actions are dependency-safe", async () => {
  const [libraryAction, libraryMigration, trackAction, trackMigration, trackEditor] = await Promise.all([
    source("apps/web/app/actions/library.ts"),
    source("supabase/migrations/20260730021926_safe_library_content_archiving.sql"),
    source("apps/web/app/admin/produto/track-actions.ts"),
    source("supabase/migrations/20260730022413_safe_admin_track_archiving.sql"),
    source("apps/web/app/admin/produto/trilha-editor.tsx"),
  ]);

  assert.match(libraryAction, /archive_library_content/u);
  assert.match(libraryMigration, /LIBRARY_CONTENT_IN_USE/u);
  assert.match(trackAction, /archive_admin_track/u);
  assert.match(trackMigration, /DEFAULT_TRACK_CANNOT_BE_ARCHIVED/u);
  assert.match(trackMigration, /TRACK_HAS_ACTIVE_ASSIGNMENTS/u);
  assert.match(trackEditor, /if \(trilha\.status === "retired"\) return null/u);
});

test("gateway, actionable help, legal and admin recovery contracts are versioned", async () => {
  const [gateway, layout, usersAction, usersPage, accessPolicy, help, environment, terms, privacy, pointEditor] = await Promise.all([
    source("supabase/functions/authenticated-rpc/index.ts"),
    source("apps/web/app/layout.tsx"),
    source("apps/web/app/admin/usuarios/actions.ts"),
    source("apps/web/app/admin/usuarios/page.tsx"),
    source("apps/web/lib/auth/administrative-access.ts"),
    source("apps/web/app/ajuda/page.tsx"),
    source(".env.example"),
    source("apps/web/app/termos/page.tsx"),
    source("apps/web/app/privacidade/page.tsx"),
    source("apps/web/app/admin/gamificacao/point-rule-editor.tsx"),
  ]);

  for (const rpc of [
    "archive_admin_interface_content",
    "archive_admin_track",
    "archive_library_content",
    "award_participant_action_points",
    "complete_participant_diagnostic_with_points",
    "list_operator_certificate_templates",
    "register_admin_interface_content",
    "save_admin_journey",
    "save_admin_lesson",
    "save_admin_track",
  ]) {
    assert.match(gateway, new RegExp(`\\b${rpc}\\b`, "u"));
  }
  assert.match(layout, /SupportButton/u);
  assert.match(help, /Abrir WhatsApp/u);
  assert.match(help, /Enviar e-mail/u);
  assert.match(environment, /SUPPORT_EMAIL=contato@estimulo\.org/u);
  assert.match(environment, /SUPPORT_WHATSAPP_URL=https:\/\/wa\.me\/5511935027090/u);
  assert.match(usersAction, /sendUserPasswordRecoveryAction/u);
  assert.match(usersAction, /usesCorporateGoogleIdentity/u);
  assert.doesNotMatch(usersAction, /@estimulo\.org/u);
  assert.match(usersPage, /E-mail, papel, status ou ID/u);
  assert.match(accessPolicy, /usesCorporateGoogleIdentity/u);
  assert.match(terms, /aprovação jurídica/u);
  assert.match(privacy, /responsável jurídico e de privacidade/u);
  assert.match(pointEditor, /diagnostic\.session\.completed/u);
});

test("participant journeys, library formats and administrative user discovery follow the consolidated UX", async () => {
  const [catalog, journey, library, users] = await Promise.all([
    source("apps/web/app/empreendedor/jornadas/page.tsx"),
    source("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
    source("apps/web/components/participant-library-page.tsx"),
    source("apps/web/app/admin/usuarios/page.tsx"),
  ]);

  assert.doesNotMatch(catalog, /Jornada em destaque/iu);
  assert.match(catalog, /Capacitação Estímulo/u);
  assert.match(journey, /participantEyebrow/u);
  assert.match(journey, /Seu caminho de aprendizagem/u);
  assert.match(journey, /PendingSubmitButton/u);
  assert.match(journey, /activityLabels/u);
  for (const icon of ["Newspaper", "Video", "Podcast", "BookOpen", "Wrench", "GraduationCap"]) {
    assert.match(library, new RegExp(`\\b${icon}\\b`, "u"));
  }
  assert.match(library, /formatIcon\(item\.content_format, item\.content_kind\)/u);
  assert.match(users, /membership\.user_account_id/u);
  assert.match(users, /membership\.membership_id/u);
  assert.match(users, /role\.role_name/u);
  assert.match(users, /membershipMatches/u);
});

test("migration boundary preserves release hardening and growth extensions", async () => {
  const validator = await source("scripts/database/migration-history/validate-active-migrations.mjs");
  for (const migration of [
    "20260729235959_release_readiness_fk_indexes.sql",
    "20260730000000_fix_published_mutation_guard.sql",
    "20260730000001_restore_path_template_presentation.sql",
    "20260730000002_portable_auth_identity_resolution.sql",
    "20260730020728_complete_diagnostic_point_rule.sql",
    "20260730021001_operator_certificate_template_catalog.sql",
    "20260730021926_safe_library_content_archiving.sql",
    "20260730022413_safe_admin_track_archiving.sql",
    "20260730113000_normalize_diagnostic_point_rule_eligibility.sql",
    "20260730130000_atomic_diagnostic_completion_points.sql",
    "20260730150000_openai_official_drive_videos.sql",
    "20260730183000_optional_journey_program.sql",
    "20260730183100_admin_journey_and_diagnostic_lifecycle.sql",
    "20260730183200_route_admin_lifecycle_through_product_rpc.sql",
    "20260730211500_platform_growth_engagement_tables.sql",
    "20260730211600_platform_growth_engagement_helpers.sql",
    "20260730211700_get_admin_extensions_workspace.sql",
    "20260730211800_get_participant_extensions.sql",
    "20260730211900_perform_participant_extension.sql",
    "20260730212000_save_admin_extension.sql",
    "20260730212100_certificate_template_inheritance.sql",
    "20260730212200_tracking_and_ai_delivery_support.sql",
    "20260730212300_enable_extension_rls.sql",
  ]) {
    assert.match(validator, new RegExp(migration.replaceAll(".", "\\."), "u"));
  }
  assert.match(validator, /expectedLastMigration = '20260730212300_enable_extension_rls\.sql'/u);
});
