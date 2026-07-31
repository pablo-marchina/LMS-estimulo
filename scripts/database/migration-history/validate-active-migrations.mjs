import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const recoveredHistoryLastVersion = '20260714161338';
const expectedLastMigration = '20260730211500_platform_growth_engagement_tables.sql';
const requiredFinalReleaseMigrations = Object.freeze([
  '20260729190031_generic_journey_version_editor.sql',
  '20260729190353_generic_journey_editor_assessment_details.sql',
  '20260729190547_generic_journey_path_badge_editor.sql',
  '20260729191801_generic_journey_editor_event_schemas.sql',
  '20260729192423_generic_journey_path_badge_removal.sql',
  '20260729193313_generic_journey_path_presentation_event_schema.sql',
  '20260729201729_general_interface_content_cms.sql',
  '20260729202723_draft_published_track_lifecycle.sql',
  '20260729203000_m17_runtime_hardening.sql',
  '20260729204500_interface_content_cms.sql',
  '20260729205000_replace_opaque_dimension_scores.sql',
  '20260729205253_flexible_interface_cms_registry.sql',
  '20260729205336_live_journey_editing.sql',
  '20260729205423_live_track_editing.sql',
  '20260729205538_live_lesson_editing.sql',
  '20260729211812_safe_public_interface_content_read.sql',
  '20260729212708_safe_public_interface_content_read_fix.sql',
  '20260729212843_public_interface_content_projection.sql',
  '20260729212903_public_interface_content_projection_rls.sql',
  '20260729213127_interface_page_header_registry.sql',
  '20260729215924_remove_admin_maturity_screen.sql',
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
  expectedLastMigration,
]);

export async function validateActiveMigrations() {
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
