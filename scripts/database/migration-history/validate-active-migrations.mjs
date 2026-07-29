import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const recoveredHistoryLastVersion = '20260714161338';
const expectedActiveMigrations = Object.freeze([
  '20260714184729_activity_comments_schema.sql',
  '20260714184752_activity_comments_participant_api.sql',
  '20260714184813_activity_comments_operator_api.sql',
  '20260715143709_practice_uploads_schema.sql',
  '20260715143808_practice_uploads_participant_api.sql',
  '20260715143842_practice_uploads_operator_api.sql',
  '20260715155144_learning_credentials_schema.sql',
  '20260715155610_learning_credentials_context.sql',
  '20260715155647_learning_credentials_candidates.sql',
  '20260715155753_learning_credentials_issuance_api.sql',
  '20260715155834_learning_credentials_read_api.sql',
  '20260715161140_learning_credentials_verify_hardening.sql',
  '20260715191916_content_library_schema.sql',
  '20260715191948_content_library_read_api.sql',
  '20260715192055_content_library_save_api.sql',
  '20260715192121_content_library_publish_api.sql',
  '20260715192145_content_library_access_api.sql',
  '20260715192207_content_library_event_versioning.sql',
  '20260715193828_content_library_fk_indexes.sql',
  '20260715224122_test_public_signup_provisioning.sql',
  '20260720172500_rbac_event_schemas.sql',
  '20260720173000_rbac_role_management.sql',
  '20260720174500_rbac_role_manager_bootstrap.sql',
  '20260720175500_rbac_transaction_time.sql',
  '20260720180000_rbac_validity_window.sql',
  '20260720181500_public_signup.sql',
  '20260720183000_business_maturity_draft.sql',
  '20260720183500_business_maturity_preview_api.sql',
  '20260720184500_activity_utility_ratings.sql',
  '20260720185000_application_readiness.sql',
  '20260720185500_fk_covering_indexes.sql',
  '20260720190000_protected_cpf_signup.sql',
  '20260720190500_participant_engagement_hub.sql',
  '20260720190600_participant_engagement_hub_fix.sql',
  '20260720190700_announcement_fk_indexes.sql',
  '20260720190800_participant_journey_outline.sql',
  '20260720190900_participant_journey_outline_fix.sql',
  '20260720190940_disable_scanner_cron.sql',
  '20260720190950_prepare_remove_malware_scanner.sql',
  '20260720190960_remove_scanner_alert_dependencies.sql',
  '20260720190970_remove_scanner_metric_dependencies.sql',
  '20260720190980_remove_regenerated_scanner_metrics.sql',
  '20260720191000_remove_malware_scanner.sql',
  '20260720191005_drop_scanner_provider_queues.sql',
  '20260720191500_integral_admin_product_management.sql',
  '20260720191510_fix_admin_reporting_relations.sql',
  '20260720191520_complete_integral_admin_role.sql',
  '20260721171000_remove_test_public_signup.sql',
  '20260729182300_m17_runtime_hardening.sql',
]);

export async function validateActiveMigrations() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) > recoveredHistoryLastVersion)
    .sort();

  assert.deepEqual(
    files,
    expectedActiveMigrations,
    'active migration set differs from the applied development/test history',
  );

  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, 'active migration versions are not unique');

  return {
    status: 'valid',
    recovered_history_last_version: recoveredHistoryLastVersion,
    active_migration_count: files.length,
    first_active_version: versions[0],
    last_active_version: versions.at(-1),
    files,
  };
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  validateActiveMigrations()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
