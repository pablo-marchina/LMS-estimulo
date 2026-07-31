import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const [
  responsiveMedia,
  layout,
  supportButton,
  quickBuilder,
  lessonActions,
  libraryAdmin,
  libraryPreview,
  libraryContentPreview,
  journeyPage,
  journeyAction,
  settingsPage,
  certificateRedirect,
  certificateManager,
  certificateUpload,
  credentialFiles,
  campaignsPage,
  campaignAction,
  trackingRoute,
  loginActions,
  b2bAdmin,
  b2bParticipant,
  rewardsAdmin,
  rewardsParticipant,
  rewardsExperience,
  deliveriesAdmin,
  deliveriesParticipant,
  deliveryUploadRoute,
  aiGrader,
  diagnosticsAdmin,
  optionalForm,
  optionalParticipant,
  optionalActions,
  behaviorAdmin,
  behaviorTracker,
  behaviorEventsRoute,
  participantWorkspaceMigration,
  participantRuntimeMigration,
  adminRuntimeMigration,
  environment,
  implementationDoc,
] = await Promise.all([
  read("apps/web/app/responsive-media.css"),
  read("apps/web/app/layout.tsx"),
  read("apps/web/components/support-button.tsx"),
  read("apps/web/app/admin/produto/quick-check-builder-fields.tsx"),
  read("apps/web/app/admin/produto/actions.ts"),
  read("apps/web/app/admin/biblioteca/page.tsx"),
  read("apps/web/components/participant-library-page.tsx"),
  read("apps/web/components/participant-library-content-page.tsx"),
  read("apps/web/app/admin/produto/page.tsx"),
  read("apps/web/app/admin/produto/journey-action.ts"),
  read("apps/web/app/admin/configuracoes/page.tsx"),
  read("apps/web/app/admin/certificados/page.tsx"),
  read("apps/web/app/admin/gamificacao/certificate-template-manager.tsx"),
  read("apps/web/app/api/certificate-template-uploads/route.ts"),
  read("apps/web/lib/storage/credential-files.ts"),
  read("apps/web/app/admin/campanhas/page.tsx"),
  read("apps/web/app/admin/extension-actions.ts"),
  read("apps/web/app/r/[slug]/route.ts"),
  read("apps/web/app/entrar/actions.ts"),
  read("apps/web/app/admin/b2b/page.tsx"),
  read("apps/web/app/empreendedor/b2b/[slug]/page.tsx"),
  read("apps/web/app/admin/recompensas/page.tsx"),
  read("apps/web/app/empreendedor/recompensas/page.tsx"),
  read("apps/web/app/empreendedor/recompensas/rewards-experience.tsx"),
  read("apps/web/components/admin-delivery-configuration-manager.tsx"),
  read("apps/web/app/empreendedor/entregas/page.tsx"),
  read("apps/web/app/api/delivery-uploads/route.ts"),
  read("supabase/functions/ai-grade-submission/index.ts"),
  read("apps/web/app/admin/diagnostico/page.tsx"),
  read("apps/web/app/admin/diagnosticos-opcionais/optional-diagnostic-form.tsx"),
  read("apps/web/app/empreendedor/perfil/diagnosticos/[availabilityId]/page.tsx"),
  read("apps/web/app/empreendedor/perfil/diagnosticos/[availabilityId]/actions.ts"),
  read("apps/web/app/admin/comportamento/page.tsx"),
  read("apps/web/components/behavior-event-tracker.tsx"),
  read("apps/web/app/api/behavior-events/route.ts"),
  read("supabase/migrations/20260730211800_get_participant_extensions.sql"),
  read("supabase/migrations/20260730211900_perform_participant_extension.sql"),
  read("supabase/migrations/20260730212000_save_admin_extension.sql"),
  read(".env.example"),
  read("docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md"),
]);

test("responsive media never exceeds the viewport and is loaded globally", () => {
  assert.match(layout, /responsive-media\.css/u);
  assert.match(responsiveMedia, /width:\s*min\(100%,\s*960px\)/u);
  assert.match(responsiveMedia, /max-width:\s*calc\(100vw\s*-\s*2rem\)/u);
  assert.match(responsiveMedia, /max-height:\s*min\(70dvh,\s*720px\)/u);
  assert.match(responsiveMedia, /100dvh/u);
});

test("help remains available to participants but is hidden in administration", () => {
  assert.match(layout, /SupportButton/u);
  assert.match(supportButton, /pathname === "\/admin"/u);
  assert.match(supportButton, /pathname\.startsWith\("\/admin\/"\)/u);
});

test("quick checks have dynamic count in both client and server", () => {
  assert.match(quickBuilder, /setCount\(\(value\) => value \+ 1\)/u);
  assert.match(lessonActions, /quiz_question_count/u);
  assert.doesNotMatch(quickBuilder, /Math\.min\(3/u);
  assert.doesNotMatch(lessonActions, /Math\.min\(3/u);
});

test("library and journeys use managed multi-theme selectors", () => {
  assert.match(settingsPage, /resource_type" value="theme"/u);
  assert.match(settingsPage, /theme_delete/u);
  assert.match(libraryAdmin, /name="theme_ids" multiple/u);
  assert.match(journeyPage, /name="theme_ids" multiple/u);
  assert.match(journeyAction, /journey_themes_set/u);
  assert.doesNotMatch(libraryAdmin, /name="topics"/u);
});

test("administrative library preview uses participant rendering without side effects", () => {
  assert.match(libraryPreview, /previewMode/u);
  assert.match(libraryPreview, /adminPreviewListing/u);
  assert.match(libraryContentPreview, /adminPreviewContent/u);
  assert.match(libraryContentPreview, /!previewMode \? <LibraryAccessTracker/u);
  assert.match(libraryContentPreview, /Na prévia, o link é aberto sem registrar acesso/u);
});

test("certificate templates accept PDF or image and support inherited scopes inside certificates", () => {
  assert.match(credentialFiles, /application\/pdf/u);
  assert.match(credentialFiles, /image\/png/u);
  assert.match(certificateUpload, /scopeSchema = z\.enum\(\["global", "program", "journey"\]\)/u);
  assert.match(certificateManager, /Modelo geral/u);
  assert.match(certificateManager, /Modelo de um programa/u);
  assert.match(certificateManager, /Modelo de uma jornada/u);
  assert.match(certificateRedirect, /\/admin\/gamificacao\?tipo=certificados/u);
  assert.match(adminRuntimeMigration, /certificate_template_assignment/u);
});

test("UTM records complete visits, associates after login and keeps authorization", () => {
  assert.match(campaignsPage, /utm_source/u);
  assert.match(campaignsPage, /destination_path/u);
  assert.match(campaignAction, /payload\.skip_steps/u);
  assert.match(trackingRoute, /capture_tracking_visit/u);
  assert.match(loginActions, /tracking_associate/u);
  assert.match(participantRuntimeMigration, /destination_path/u);
  assert.match(participantRuntimeMigration, /acquisition_touchpoints/u);
});

test("B2B access is selected by users or groups and enforced in the participant workspace", () => {
  assert.match(b2bAdmin, /B2B/u);
  assert.match(b2bAdmin, /user_ids/u);
  assert.match(b2bAdmin, /group_ids/u);
  assert.match(b2bParticipant, /extensionsRuntime\.participant/u);
  assert.match(participantWorkspaceMigration, /b2b_page_user_access/u);
  assert.match(participantWorkspaceMigration, /b2b_page_group_access/u);
  assert.match(participantWorkspaceMigration, /gm\.user_account_id=p_actor_user_account_id/u);
});

test("reward cancellation refunds points and stock transactionally", () => {
  assert.match(rewardsAdmin, /redemption_status/u);
  assert.match(rewardsParticipant, /RewardsExperience/u);
  assert.match(rewardsExperience, /reward_convert/u);
  assert.match(rewardsExperience, /reward_redeem/u);
  assert.match(adminRuntimeMigration, /redemption_refund/u);
  assert.match(adminRuntimeMigration, /stock_quantity\+v_redemption\.quantity/u);
  assert.match(adminRuntimeMigration, /balance=balance\+v_redemption\.points_spent/u);
});

test("deliveries support library content, activities and safe AI review modes", () => {
  assert.match(deliveriesAdmin, /target_type/u);
  assert.match(deliveriesAdmin, /ai_assistant/u);
  assert.match(deliveriesAdmin, /ai_human_review/u);
  assert.match(deliveriesParticipant, /\/api\/delivery-uploads/u);
  assert.match(deliveryUploadRoute, /action:\s*"delivery_submit"/u);
  assert.match(participantRuntimeMigration, /target_type='library'/u);
  assert.match(participantRuntimeMigration, /target_type='activity'/u);
  assert.match(aiGrader, /Encaminhada para revisão humana/u);
  assert.match(aiGrader, /apply_ai_delivery_review/u);
  assert.doesNotMatch(aiGrader, /child_process|\bexec\(|\bspawn\(/u);
});

test("optional diagnostics remain inside diagnostics and never update archetype or journey eligibility", () => {
  assert.match(diagnosticsAdmin, /Opcionais no perfil/u);
  assert.match(diagnosticsAdmin, /OptionalDiagnosticForm/u);
  assert.match(optionalForm, /resource_type" value="optional_diagnostic"/u);
  assert.match(optionalParticipant, /startOptionalDiagnosticAction/u);
  assert.match(optionalActions, /optional_start/u);
  assert.match(optionalActions, /optional_answer/u);
  assert.match(optionalActions, /optional_complete/u);
  assert.doesNotMatch(participantRuntimeMigration, /archetype_assignments/u);
  assert.doesNotMatch(participantRuntimeMigration, /eligible_archetype_codes/u);
});

test("behavior score is analytical only and starts without historical backfill", () => {
  assert.match(behaviorTracker, /\/api\/behavior-events/u);
  assert.match(behaviorEventsRoute, /action:\s*"behavior_event"/u);
  assert.match(behaviorAdmin, /behavior_recalculate/u);
  assert.match(adminRuntimeMigration, /behavior_score_snapshots/u);
  assert.doesNotMatch(participantRuntimeMigration, /behavior_score_snapshots/u);
  assert.doesNotMatch(adminRuntimeMigration, /historical_backfill/u);
  assert.match(implementationDoc, /exclusivamente analítico/u);
  assert.match(implementationDoc, /não existe reconstrução de eventos antigos/u);
});

test("external export remains destination-neutral", () => {
  assert.doesNotMatch(environment, /HUBSPOT/iu);
  assert.match(environment, /ETL_EXPORT_ENABLED=false/u);
  assert.match(implementationDoc, /outbox genérica/u);
});
