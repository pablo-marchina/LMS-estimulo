import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedLastMigration, requiredFinalReleaseMigrations } from './active-release-boundary.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const recoveredHistoryLastVersion = '20260714161338';

// Historical release boundary retained for repository-contract regression coverage: expectedLastMigration = '20260810152000_dynamic_participant_greeting.sql'
// These anchors keep long-lived release invariants visible here while the full manifest lives in active-release-boundary.mjs.
const historicalReleaseAnchors = Object.freeze([
  '20260729235959_release_readiness_fk_indexes.sql',
  '20260730000000_fix_published_mutation_guard.sql',
  '20260730000001_restore_path_template_presentation.sql',
  '20260730000002_portable_auth_identity_resolution.sql',
  '20260730020728_complete_diagnostic_point_rule.sql',
  '20260730021001_operator_certificate_template_catalog.sql',
  '20260730021926_safe_library_content_archiving.sql',
  '20260730022413_safe_admin_track_archiving.sql',
  '20260730113000_normalize_diagnostic_point_rule_eligibility.sql',
  '20260730130000_atomic_diagnostic_completion_points.sql',
  '20260730150000_openai_official_drive_videos.sql',
  '20260730183000_optional_journey_program.sql',
  '20260730183100_admin_journey_and_diagnostic_lifecycle.sql',
  '20260730183200_route_admin_lifecycle_through_product_rpc.sql',
  '20260730211500_platform_growth_engagement_tables.sql',
  '20260730211600_platform_growth_engagement_helpers.sql',
  '20260730211700_get_admin_extensions_workspace.sql',
  '20260730211800_get_participant_extensions.sql',
  '20260730211900_perform_participant_extension.sql',
  '20260730212000_save_admin_extension.sql',
  '20260730212100_certificate_template_inheritance.sql',
  '20260730212200_tracking_and_ai_delivery_support.sql',
  '20260730212300_enable_extension_rls.sql',
  '20260731150000_admin_program_management.sql',
  '20260731180000_admin_delivery_and_journey_corrections.sql',
  '20260731180100_harden_ai_grading_provider_storage.sql',
  '20260806023000_definitive_platform_content_progress_certificates.sql',
  '20260806120000_admin_interface_and_user_directory_completeness.sql',
  '20260806144500_definitive_admin_gamification_and_user_directory.sql',
  '20260810151000_complete_participant_journey_projection.sql',
  '20260810152000_dynamic_participant_greeting.sql',
]);

export async function validateActiveMigrations() {
  for (const migration of historicalReleaseAnchors) {
    assert.ok(requiredFinalReleaseMigrations.includes(migration), `release manifest lost historical anchor: ${migration}`);
  }

  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) > recoveredHistoryLastVersion)
    .sort();

  for (const requiredMigration of requiredFinalReleaseMigrations) {
    assert.ok(files.includes(requiredMigration), `required final-release migration missing: ${requiredMigration}`);
  }

  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, 'active migration versions are not unique');
  for (let index = 1; index < versions.length; index += 1) {
    assert.ok(versions[index] > versions[index - 1], 'active migration versions must be strictly increasing');
  }
  assert.equal(files.at(-1), expectedLastMigration, 'unexpected migration exists after the approved release boundary');

  return {
    status: 'valid',
    recovered_history_last_version: recoveredHistoryLastVersion,
    active_migration_count: files.length,
    first_active_version: versions[0],
    last_active_version: versions.at(-1),
    required_final_release_migrations: requiredFinalReleaseMigrations,
  };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  validateActiveMigrations()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
