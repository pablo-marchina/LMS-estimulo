import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const interfaceSelector = await readFile("apps/web/app/admin/experiencia/visual-interface-selector.tsx", "utf8");
const interfaceBridge = await readFile("apps/web/components/interface-preview-bridge.tsx", "utf8");
const participantJourneys = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const journeyGeneralSection = await readFile("apps/web/app/admin/produto/product-general-section.tsx", "utf8");
const journeyPublicationSection = await readFile("apps/web/app/admin/produto/product-publication-section.tsx", "utf8");
const deleteJourneyAction = await readFile("apps/web/app/admin/produto/delete-journey-action.ts", "utf8");
const unpublishJourneyAction = await readFile("apps/web/app/admin/produto/unpublish-action.ts", "utf8");
const diagnosticPage = await readFile("apps/web/app/admin/diagnostico/page.tsx", "utf8");
const diagnosticPrincipal = await readFile("apps/web/app/admin/diagnostico/principal-section.tsx", "utf8");
const diagnosticActions = await readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8");
const optionalProgramMigration = await readFile("supabase/migrations/20260730183000_optional_journey_program.sql", "utf8");
const lifecycleMigration = await readFile("supabase/migrations/20260730183100_admin_journey_and_diagnostic_lifecycle.sql", "utf8");
const correctionMigration = await readFile("supabase/migrations/20260731180000_admin_delivery_and_journey_corrections.sql", "utf8");

test("interface preview keeps the static same-origin security boundary", () => {
  assert.match(interfaceSelector, /<iframe/u);
  assert.match(interfaceSelector, /event\.origin !== window\.location\.origin/u);
  assert.match(interfaceSelector, /referrerPolicy="same-origin"/u);
  assert.doesNotMatch(interfaceSelector, /srcDoc=/u);
  assert.match(interfaceBridge, /window\.parent\.postMessage/u);
  assert.match(interfaceBridge, /data-interface-content-key/u);
});

test("journey lifecycle surfaces remain wired to the canonical destructive operations", () => {
  assert.match(journeyGeneralSection, /Programa/u);
  assert.match(journeyGeneralSection, /\(opcional\)/u);
  assert.match(journeyGeneralSection, /1200 × 1200 px/u);
  assert.match(journeyGeneralSection, /1920 × 900 px/u);
  assert.match(journeyGeneralSection, /deleteJourneyAction/u);
  assert.match(journeyPublicationSection, /unpublishJourneyAction/u);
  assert.match(journeyPublicationSection, /retireJourneyAction/u);
  assert.match(deleteJourneyAction, /deleteAdminJourneyDraft/u);
  assert.doesNotMatch(deleteJourneyAction, /retireAdminJourney/u);
  assert.match(unpublishJourneyAction, /unpublishAdminJourneyToDraft/u);
  assert.match(optionalProgramMigration, /alter column program_id drop not null/u);
  assert.doesNotMatch(optionalProgramMigration, /PROGRAM_REQUIRED/u);
  assert.match(lifecycleMigration, /create or replace function public\.retire_admin_journey/u);
  assert.match(correctionMigration, /create or replace function public\.delete_admin_journey_draft/u);
  assert.match(correctionMigration, /create or replace function public\.unpublish_admin_journey_to_draft/u);
});

test("participant journey covers keep the neutral readability overlay", () => {
  assert.doesNotMatch(participantJourneys, /absolute inset-0 bg-primary\/25/u);
  assert.doesNotMatch(participantJourneys, /absolute inset-0 bg-primary\/80/u);
  assert.match(participantJourneys, /bg-gradient-to-r from-black\/80 via-black\/60 to-black\/25/u);
});

test("diagnostic configuration stays dynamic and publication keeps migration coverage", () => {
  assert.doesNotMatch(`${diagnosticPage}\n${diagnosticPrincipal}`, /const ARCHETYPES/u);
  assert.doesNotMatch(`${diagnosticPage}\n${diagnosticPrincipal}`, /const DIMENSIONS/u);
  assert.match(diagnosticActions, /archetype_codes: profiles\.map/u);
  assert.match(diagnosticActions, /publishAdminDiagnosticTransition/u);
  assert.match(lifecycleMigration, /ARCHETYPE_MAPPING_INCOMPLETE/u);
  assert.match(lifecycleMigration, /update diagnostics\.archetype_assignments/u);
  assert.match(lifecycleMigration, /update catalog\.journey_versions/u);
});
