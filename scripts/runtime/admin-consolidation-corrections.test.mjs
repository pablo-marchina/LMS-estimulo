import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const files = await Promise.all([
  readFile("apps/web/components/admin-shell.tsx", "utf8"),
  readFile("apps/web/app/admin/biblioteca/entregas/page.tsx", "utf8"),
  readFile("apps/web/app/admin/operacao/page.tsx", "utf8"),
  readFile("apps/web/components/admin-delivery-operations.tsx", "utf8"),
  readFile("apps/web/app/admin/experiencia/visual-interface-selector.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/product-general-section.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/product-publication-section.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/delete-journey-action.ts", "utf8"),
  readFile("apps/web/app/admin/produto/unpublish-action.ts", "utf8"),
  readFile("apps/web/app/admin/comportamento/page.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/activity-prompt-library.tsx", "utf8"),
  readFile("supabase/migrations/20260731180000_admin_delivery_and_journey_corrections.sql", "utf8"),
]);

const [
  adminShell,
  libraryDeliveries,
  operationPage,
  deliveryOperations,
  interfaceSelector,
  productGeneralSection,
  productPublicationSection,
  deleteAction,
  unpublishAction,
  behaviorPage,
  lessonPage,
  promptLibrary,
  migration,
] = files;
void behaviorPage;

test("standalone admin deliveries screen is removed and responsibilities are consolidated", async () => {
  assert.doesNotMatch(adminShell, /\/admin\/entregas/u);
  await assert.rejects(access("apps/web/app/admin/entregas/page.tsx"));
  assert.match(libraryDeliveries, /AdminDeliveryConfigurationManager/u);
  assert.match(libraryDeliveries, /Atividades com entrega/u);
  assert.match(operationPage, /AdminDeliveryOperations/u);
  assert.match(operationPage, /Configurar atividades com entrega/u);
});

test("operations exposes an encrypted organization AI provider configuration", () => {
  assert.match(deliveryOperations, /IA usada nas correções/u);
  assert.match(deliveryOperations, /api_key/u);
  assert.match(deliveryOperations, /termina em/u);
  assert.match(migration, /ai_grading_provider_settings/u);
  assert.match(migration, /pgp_sym_encrypt/u);
  assert.match(migration, /get_ai_grading_provider_runtime/u);
  assert.doesNotMatch(deliveryOperations, /value=\{provider\.api_key/u);
});

test("interface preview changes locally without remounting the administrative page", () => {
  assert.match(interfaceSelector, /window\.history\.replaceState/u);
  assert.match(interfaceSelector, /setFrameKey/u);
  assert.match(interfaceSelector, /setRoute\(nextRoute\)/u);
  assert.match(interfaceSelector, /name="estimulo-interface-preview"/u);
});

test("published journeys can return to draft and only drafts can be deleted", () => {
  assert.match(productPublicationSection, /Voltar para rascunho/u);
  assert.match(productPublicationSection, /selectedIsPublished/u);
  assert.match(productGeneralSection, /selectedIsDraft && selectedJourneyVersion && canEdit/u);
  assert.match(productGeneralSection, /Excluir rascunho/u);
  assert.doesNotMatch(deleteAction, /journey_definition_id/u);
  assert.match(deleteAction, /deleteAdminJourneyDraft/u);
  assert.match(unpublishAction, /unpublishAdminJourneyToDraft/u);
  assert.match(migration, /unpublish_admin_journey_to_draft/u);
  assert.match(migration, /delete_admin_journey_draft/u);
});

test("published lesson keeps versioned prompts inside the continuous lesson flow", () => {
  assert.doesNotMatch(lessonPage, /activity\.sections/u);
  assert.match(lessonPage, /ActivityPromptLibrary/u);
  assert.match(lessonPage, /activity\.prompts\.length/u);
  assert.match(promptLibrary, /id="prompts"/u);
  assert.match(promptLibrary, /Biblioteca de prompts desta aula/u);
  assert.match(promptLibrary, /navigator\.clipboard\.writeText/u);
  assert.doesNotMatch(lessonPage, /Prompts para adaptar/u);
  assert.doesNotMatch(migration, /-'content_sections'-'prompts'/u);
  assert.match(lessonPage, /max-w-\[1100px\]/u);
  assert.match(lessonPage, /Marcar como concluída/u);
  assert.match(lessonPage, /SectionTitle title="Avaliação"/u);
  assert.match(lessonPage, /SectionTitle title="Comentários"/u);
  assert.doesNotMatch(lessonPage, /Índice da aula/u);
  assert.doesNotMatch(lessonPage, /300px/u);
});
