import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const [
  migrations,
  applications,
  b2bAdmin,
  b2bParticipant,
  campaignsPage,
  campaignAction,
  deliveryConfigurationManager,
  optionalDiagnosticManager,
  trackingRoute,
  loginActions,
  rewardsAdmin,
  rewardsParticipant,
  rewardsExperience,
  participantWorkspaceMigration,
  participantRuntimeMigration,
  adminRuntimeMigration,
  automaticRewardMigration,
  deliveryAdminMigration,
  trackingMigration,
  behaviorScoreMigration,
] = await Promise.all([
  readdir(path.join(root, "supabase/migrations")),
  readdir(path.join(root, "apps/web/app")),
  read("apps/web/app/admin/b2b/page.tsx"),
  read("apps/web/app/empreendedor/b2b/page.tsx"),
  read("apps/web/app/admin/campanhas/page.tsx"),
  read("apps/web/app/admin/campanhas/actions.ts"),
  read("apps/web/app/admin/conteudos/delivery-configuration-manager.tsx"),
  read("apps/web/app/admin/diagnostico/optional-diagnostic-manager.tsx"),
  read("apps/web/app/api/tracking/route.ts"),
  read("apps/web/app/entrar/actions.ts"),
  read("apps/web/app/admin/recompensas/page.tsx"),
  read("apps/web/app/empreendedor/recompensas/page.tsx"),
  read("apps/web/app/empreendedor/recompensas/rewards-experience.tsx"),
  read("supabase/migrations/20260730211800_get_participant_extensions.sql"),
  read("supabase/migrations/20260730211900_perform_participant_extension.sql"),
  read("supabase/migrations/20260730212000_save_admin_extension.sql"),
  read("supabase/migrations/20260815202049_automatic_reward_points_live_alignment.sql"),
  read("supabase/migrations/20260731180000_admin_delivery_and_journey_corrections.sql"),
  read("supabase/migrations/20260730212200_tracking_and_ai_delivery_support.sql"),
  read("supabase/migrations/20260731221400_behavior_score_runtime_integration.sql"),
]);

const joinedMigrations = migrations.join("\n");
const joinedApplications = applications.join("\n");

test("platform growth extensions are represented by real migrations and application routes", () => {
  for (const fragment of [
    "platform_growth_engagement_tables",
    "platform_growth_engagement_helpers",
    "get_admin_extensions_workspace",
    "get_participant_extensions",
    "perform_participant_extension",
    "save_admin_extension",
    "certificate_template_inheritance",
    "tracking_and_ai_delivery_support",
    "enable_extension_rls",
  ]) assert.match(joinedMigrations, new RegExp(fragment, "u"));

  for (const route of ["admin", "empreendedor", "api"]) assert.match(joinedApplications, new RegExp(`^${route}$`, "mu"));
});

test("participant extensions stay tenant scoped and return only the actor-visible workspace", () => {
  assert.match(participantWorkspaceMigration, /p_actor_user_account_id/u);
  assert.match(participantWorkspaceMigration, /organization\.slug='estimulo'/u);
  assert.match(participantWorkspaceMigration, /participant_preferences/u);
  assert.match(participantWorkspaceMigration, /reward_redemptions/u);
  assert.match(participantWorkspaceMigration, /ranking/u);
  assert.match(participantWorkspaceMigration, /b2b/u);
});

test("participant extension actions route through one controlled RPC", () => {
  assert.match(participantRuntimeMigration, /perform_participant_extension_action/u);
  assert.match(participantRuntimeMigration, /reward_redeem/u);
  assert.match(participantRuntimeMigration, /certificate_add_external/u);
  assert.match(participantRuntimeMigration, /profile_save/u);
  assert.match(participantRuntimeMigration, /b2b_interaction/u);
});

test("admin extensions stay inside a privileged runtime surface", () => {
  assert.match(adminRuntimeMigration, /save_admin_extension/u);
  assert.match(adminRuntimeMigration, /reward_definition/u);
  assert.match(adminRuntimeMigration, /redemption_status/u);
  assert.match(adminRuntimeMigration, /b2b_access/u);
  assert.match(adminRuntimeMigration, /campaign/u);
});

test("tracking stores campaign visits and supports later login association", () => {
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

test("reward points are automatic while cancellation still refunds points and stock transactionally", () => {
  assert.match(rewardsAdmin, /redemption_status/u);
  assert.match(rewardsParticipant, /RewardsExperience/u);
  assert.doesNotMatch(rewardsExperience, /reward_convert/u);
  assert.match(rewardsExperience, /reward_redeem/u);
  assert.match(automaticRewardMigration, /credit_reward_wallet_from_point_ledger/u);
  assert.match(automaticRewardMigration, /REWARD_CONVERSION_DISABLED/u);
  assert.match(adminRuntimeMigration, /redemption_refund/u);
  assert.match(adminRuntimeMigration, /stock_quantity\+v_redemption\.quantity/u);
  assert.match(adminRuntimeMigration, /balance=balance\+v_redemption\.points_spent/u);
});

test("deliveries support library content, activities and safe AI review modes", () => {
  assert.match(deliveryConfigurationManager, /target_type/u);
  assert.match(deliveryConfigurationManager, /ai_assistant/u);
  assert.match(deliveryConfigurationManager, /ai_human_review/u);
  assert.match(deliveryAdminMigration, /delivery_definition/u);
  assert.match(deliveryAdminMigration, /delivery_submission/u);
  assert.match(deliveryAdminMigration, /ai_provider_configuration/u);
});

test("optional diagnostics remain inside diagnostics and never update archetype or journey eligibility", () => {
  assert.match(optionalDiagnosticManager, /optional_diagnostic_definition/u);
  assert.match(optionalDiagnosticManager, /optional_diagnostic_version/u);
  assert.match(optionalDiagnosticManager, /optional_diagnostic_response/u);
  assert.doesNotMatch(optionalDiagnosticManager, /archetype_assignment/u);
  assert.doesNotMatch(optionalDiagnosticManager, /journey_eligib/u);
});

test("behavior score is analytical only and starts without historical backfill", () => {
  assert.match(behaviorScoreMigration, /behavior_score/u);
  assert.match(behaviorScoreMigration, /analytics/u);
  assert.doesNotMatch(behaviorScoreMigration, /credit_decision/u);
  assert.doesNotMatch(behaviorScoreMigration, /insert into analytics\.behavior_scores[\s\S]*select/iu);
});

test("external export remains destination-neutral", () => {
  assert.match(trackingMigration, /destination_provider/u);
  assert.doesNotMatch(trackingMigration, /hubspot\.com/u);
});
