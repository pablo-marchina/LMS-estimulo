import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const interfacePage = await readFile(
  "apps/web/app/admin/experiencia/page.tsx",
  "utf8",
);
const interfaceActions = await readFile(
  "apps/web/app/admin/experiencia/actions.ts",
  "utf8",
);
const interfaceSelector = await readFile(
  "apps/web/app/admin/experiencia/visual-interface-selector.tsx",
  "utf8",
);
const interfaceBridge = await readFile(
  "apps/web/components/interface-preview-bridge.tsx",
  "utf8",
);
const journeyPage = await readFile(
  "apps/web/app/admin/produto/page.tsx",
  "utf8",
);
const journeyGeneral = await readFile(
  "apps/web/app/admin/produto/journey-general-section.tsx",
  "utf8",
);
const journeyPublication = await readFile(
  "apps/web/app/admin/produto/journey-publication-section.tsx",
  "utf8",
);
const participantJourneys = await readFile(
  "apps/web/app/empreendedor/jornadas/page.tsx",
  "utf8",
);
const activityFields = await readFile(
  "apps/web/app/admin/produto/activity-content-fields.tsx",
  "utf8",
);
const lessonBuilder = await readFile(
  "apps/web/app/admin/produto/trilha-aula-builder.tsx",
  "utf8",
);
const deleteJourneyAction = await readFile(
  "apps/web/app/admin/produto/delete-journey-action.ts",
  "utf8",
);
const unpublishJourneyAction = await readFile(
  "apps/web/app/admin/produto/unpublish-action.ts",
  "utf8",
);
const diagnosticPage = await readFile(
  "apps/web/app/admin/diagnostico/page.tsx",
  "utf8",
);
const diagnosticPrincipal = await readFile(
  "apps/web/app/admin/diagnostico/principal-section.tsx",
  "utf8",
);
const diagnosticBuilder = await readFile(
  "apps/web/app/admin/diagnostico/diagnostic-builder.tsx",
  "utf8",
);
const diagnosticActions = await readFile(
  "apps/web/app/admin/diagnostico/actions.ts",
  "utf8",
);
const optionalProgramMigration = await readFile(
  "supabase/migrations/20260730183000_optional_journey_program.sql",
  "utf8",
);
const lifecycleMigration = await readFile(
  "supabase/migrations/20260730183100_admin_journey_and_diagnostic_lifecycle.sql",
  "utf8",
);
const correctionMigration = await readFile(
  "supabase/migrations/20260731180000_admin_delivery_and_journey_corrections.sql",
  "utf8",
);

test("interface editor uses the effective permission and a same-origin clickable preview", () => {
  assert.match(interfacePage, /journey\.definition\.manage/u);
  assert.match(interfaceActions, /canManageInterface/u);
  assert.match(interfaceSelector, /Página exibida/u);
  assert.match(interfaceSelector, /entryMatchesRoute/u);
  assert.match(interfaceSelector, /<iframe/u);
  assert.match(interfaceSelector, /interface_preview/u);
  assert.match(interfaceSelector, /estimulo:interface-content-selected/u);
  assert.match(
    interfaceSelector,
    /event\.origin !== window\.location\.origin/u,
  );
  assert.match(interfaceSelector, /referrerPolicy="same-origin"/u);
  assert.doesNotMatch(interfaceSelector, /srcDoc=/u);
  assert.match(interfaceBridge, /window\.parent\.postMessage/u);
  assert.match(interfaceBridge, /data-interface-content-key/u);
});

test("journey editor composes lifecycle sections while preserving the published/draft contract", () => {
  const journeySurface = `${journeyPage}\n${journeyGeneral}\n${journeyPublication}`;

  assert.match(journeyPage, /loadAdminProductPageModel/u);
  assert.match(journeyPage, /JourneyGeneralSection/u);
  assert.match(journeyPage, /JourneyPublicationSection/u);
  assert.match(journeyGeneral, /Programa[\s\S]*\(opcional\)/u);
  assert.match(journeyGeneral, /<option value="">Sem programa<\/option>/u);
  assert.doesNotMatch(journeyGeneral, /name="program_id" required/u);
  assert.doesNotMatch(journeySurface, /Versões anteriores/u);
  assert.match(journeyGeneral, /1200 × 1200 px/u);
  assert.match(journeyGeneral, /1920 × 900 px/u);
  assert.match(journeyGeneral, /deleteJourneyAction/u);
  assert.match(journeyPublication, /unpublishJourneyAction/u);
  assert.match(deleteJourneyAction, /deleteAdminJourneyDraft/u);
  assert.doesNotMatch(deleteJourneyAction, /retireAdminJourney/u);
  assert.match(unpublishJourneyAction, /unpublishAdminJourneyToDraft/u);
  assert.match(optionalProgramMigration, /alter column program_id drop not null/u);
  assert.doesNotMatch(optionalProgramMigration, /PROGRAM_REQUIRED/u);
  assert.match(
    lifecycleMigration,
    /create or replace function public\.retire_admin_journey/u,
  );
  assert.match(
    correctionMigration,
    /create or replace function public\.delete_admin_journey_draft/u,
  );
  assert.match(
    correctionMigration,
    /create or replace function public\.unpublish_admin_journey_to_draft/u,
  );
});

test("participant journey covers preserve their original colors with a neutral readability overlay", () => {
  assert.doesNotMatch(
    participantJourneys,
    /absolute inset-0 bg-primary\/25/u,
  );
  assert.doesNotMatch(
    participantJourneys,
    /absolute inset-0 bg-primary\/80/u,
  );
  assert.match(
    participantJourneys,
    /bg-gradient-to-r from-black\/80 via-black\/60 to-black\/25/u,
  );
  assert.match(participantJourneys, /max-sm:opacity-25/u);
});

test("lesson editor keeps the main content visible, removes supplemental text and preserves prompt resources", () => {
  assert.match(activityFields, /Conteúdo atual/u);
  assert.match(activityFields, /selectedLibraryItem\.body/u);
  assert.match(activityFields, /Abrir conteúdo atual/u);
  assert.doesNotMatch(
    activityFields,
    /Texto e recursos salvos na atividade/u,
  );
  assert.doesNotMatch(activityFields, /ConfigurationPreview/u);
  assert.doesNotMatch(lessonBuilder, /Texto complementar/u);
  assert.match(lessonBuilder, /Prompts prontos/u);
  assert.match(lessonBuilder, /prompt_title_/u);
  assert.match(lessonBuilder, /Biblioteca de prompts desta aula/u);
});

test("diagnostics support dynamic profiles and dimensions with mandatory publication mapping", () => {
  assert.match(diagnosticPage, /PrincipalDiagnosticSection/u);
  assert.match(diagnosticPrincipal, /DiagnosticBuilder/u);
  assert.doesNotMatch(
    `${diagnosticPage}\n${diagnosticPrincipal}`,
    /const ARCHETYPES/u,
  );
  assert.doesNotMatch(
    `${diagnosticPage}\n${diagnosticPrincipal}`,
    /const DIMENSIONS/u,
  );
  assert.match(diagnosticBuilder, /Adicionar perfil/u);
  assert.match(diagnosticBuilder, /Adicionar dimensão/u);
  assert.match(diagnosticBuilder, /Migração dos perfis atuais/u);
  assert.match(diagnosticActions, /archetype_codes: profiles\.map/u);
  assert.match(diagnosticActions, /publishAdminDiagnosticTransition/u);
  assert.match(lifecycleMigration, /ARCHETYPE_MAPPING_INCOMPLETE/u);
  assert.match(
    lifecycleMigration,
    /update diagnostics\.archetype_assignments/u,
  );
  assert.match(lifecycleMigration, /update catalog\.journey_versions/u);
  assert.match(lifecycleMigration, /status='published'/u);
});
