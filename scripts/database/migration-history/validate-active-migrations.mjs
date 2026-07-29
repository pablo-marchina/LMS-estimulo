import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const migrationsDirectory = path.join(repositoryRoot, 'supabase/migrations');
const recoveredHistoryLastVersion = '20260714161338';
const frozenReleaseBaseBoundary = '20260729204500_interface_content_cms.sql';
const frozenReleaseBaseCount = 123;
const frozenReleaseBaseNamesSha256 = '53a70979274327b46e6bc71270d85700132fc946b80c0a36c14976a6b76eca27';
const approvedReleaseSuffix = Object.freeze([
  '20260729205000_replace_opaque_dimension_scores.sql',
]);
const requiredFinalReleaseMigrations = Object.freeze([
  '20260729190031_generic_journey_version_editor.sql',
  '20260729190353_generic_journey_editor_assessment_details.sql',
  '20260729190547_generic_journey_path_badge_editor.sql',
  '20260729191801_generic_journey_editor_event_schemas.sql',
  '20260729192423_generic_journey_path_badge_removal.sql',
  '20260729193313_generic_journey_path_presentation_event_schema.sql',
  '20260729203000_m17_runtime_hardening.sql',
  '20260729204500_interface_content_cms.sql',
  ...approvedReleaseSuffix,
]);

function fingerprint(files) {
  return createHash('sha256').update(`${files.join('\n')}\n`).digest('hex');
}

export async function validateActiveMigrations() {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) > recoveredHistoryLastVersion)
    .sort();

  const baseFiles = files.filter((file) => file <= frozenReleaseBaseBoundary);
  const suffixFiles = files.filter((file) => file > frozenReleaseBaseBoundary);

  assert.equal(
    baseFiles.length,
    frozenReleaseBaseCount,
    'frozen active migration base count differs from the approved inventory',
  );
  assert.equal(
    fingerprint(baseFiles),
    frozenReleaseBaseNamesSha256,
    'frozen active migration base names differ from the approved inventory',
  );
  assert.deepEqual(
    suffixFiles,
    approvedReleaseSuffix,
    'release migration suffix differs from the explicitly approved inventory',
  );

  for (const requiredMigration of requiredFinalReleaseMigrations) {
    assert.ok(files.includes(requiredMigration), `required final-release migration missing: ${requiredMigration}`);
  }

  const versions = files.map((file) => file.slice(0, 14));
  assert.equal(new Set(versions).size, versions.length, 'active migration versions are not unique');
  for (let index = 1; index < versions.length; index += 1) {
    assert.ok(versions[index] > versions[index - 1], 'active migration versions must be strictly increasing');
  }
  assert.equal(
    files.at(-1),
    approvedReleaseSuffix.at(-1),
    'unexpected migration exists after the approved release boundary',
  );

  return {
    status: 'valid',
    recovered_history_last_version: recoveredHistoryLastVersion,
    active_migration_count: files.length,
    frozen_release_base_count: baseFiles.length,
    frozen_release_base_names_sha256: fingerprint(baseFiles),
    approved_release_suffix: approvedReleaseSuffix,
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
