import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [page, archiveAction, saveAction, lifecycle] = await Promise.all([
  readFile("apps/web/app/admin/produto/page.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/retire-journey-action.ts", "utf8"),
  readFile("apps/web/app/admin/produto/journey-action.ts", "utf8"),
  readFile("apps/web/lib/admin/product-lifecycle.ts", "utf8"),
]);

test("published journeys expose archive separately from disruptive unpublish", () => {
  assert.match(page, /Arquivar jornada/u);
  assert.match(page, /action=\{retireJourneyAction\}/u);
  assert.match(page, /Digite ARQUIVAR/u);
  assert.match(page, /Voltar para rascunho/u);
  assert.match(page, /Participantes em andamento serão interrompidos imediatamente/u);
  assert.match(page, /Arquivar remove a jornada das listas ativas sem apagar o histórico/u);
});

test("journey archive action is authenticated, confirmed and routed through lifecycle RPC", () => {
  assert.match(archiveAction, /isEstimuloAdministrativeEmail/u);
  assert.match(archiveAction, /journey\.definition\.manage/u);
  assert.match(archiveAction, /confirmation !== "ARQUIVAR"/u);
  assert.match(archiveAction, /retireAdminJourney/u);
  assert.match(archiveAction, /revalidatePath\("\/empreendedor", "layout"\)/u);
  assert.match(lifecycle, /p_resource_type: "journey_retire"/u);
});

test("journey draft save does not require the optional theme workspace", () => {
  assert.match(saveAction, /let tags = themeIds\.length === 0 \? \[\] : presentationTags\(previousPresentation\.tags\)/u);
  assert.match(saveAction, /if \(themeIds\.length > 0\) \{\s*try \{\s*const extensionWorkspace = await extensionsRuntime\.adminWorkspace/u);
  assert.match(saveAction, /catch \{\s*themeSaveFailed = true;\s*\}\s*\}/u);
  assert.match(saveAction, /result = await saveAdminJourney/u);
  assert.match(saveAction, /event: "admin_journey_save_failed"/u);
});
