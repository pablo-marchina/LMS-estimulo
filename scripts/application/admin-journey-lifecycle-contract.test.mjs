import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  publicationSection,
  archiveAction,
  saveAction,
  saveService,
  lifecycle,
  nextConfig,
  bannerStorage,
] = await Promise.all([
  readFile(
    "apps/web/app/admin/produto/journey-publication-section.tsx",
    "utf8",
  ),
  readFile("apps/web/app/admin/produto/retire-journey-action.ts", "utf8"),
  readFile("apps/web/app/admin/produto/journey-action.ts", "utf8"),
  readFile("apps/web/lib/admin/journey-save.ts", "utf8"),
  readFile("apps/web/lib/admin/product-lifecycle.ts", "utf8"),
  readFile("apps/web/next.config.ts", "utf8"),
  readFile("apps/web/lib/storage/announcement-banners.ts", "utf8"),
]);

test("published journeys expose archive separately from disruptive unpublish", () => {
  assert.match(publicationSection, /Arquivar jornada/u);
  assert.match(publicationSection, /action=\{retireJourneyAction\}/u);
  assert.match(publicationSection, /Digite ARQUIVAR/u);
  assert.match(publicationSection, /Voltar para rascunho/u);
  assert.match(
    publicationSection,
    /Participantes em andamento serão interrompidos\s+imediatamente/u,
  );
  assert.match(
    publicationSection,
    /Arquivar remove a jornada das listas ativas sem apagar o\s+histórico/u,
  );
});

test("journey archive action is authenticated, confirmed and routed through lifecycle RPC", () => {
  assert.match(archiveAction, /isEstimuloAdministrativeEmail/u);
  assert.match(archiveAction, /journey\.definition\.manage/u);
  assert.match(archiveAction, /confirmation !== "ARQUIVAR"/u);
  assert.match(archiveAction, /retireAdminJourney/u);
  assert.match(
    archiveAction,
    /revalidatePath\("\/empreendedor", "layout"\)/u,
  );
  assert.match(lifecycle, /p_resource_type: "journey_retire"/u);
});

test("journey draft save delegates product persistence while keeping optional theme metadata non-blocking", () => {
  assert.match(
    saveService,
    /let tags =\s*themeIds\.length === 0\s*\?\s*\[\]\s*:\s*presentationTags\(previousPresentation\.tags\)/u,
  );
  assert.match(
    saveService,
    /if \(themeIds\.length > 0\) \{\s*try \{\s*const extensionWorkspace = await extensionsRuntime\.adminWorkspace/u,
  );
  assert.match(saveService, /themeSaveFailed = true/u);
  assert.match(saveService, /result = await saveAdminJourney/u);
  assert.match(saveAction, /saveAdminJourneyFromForm/u);
  assert.match(saveAction, /event: "admin_journey_save_failed"/u);
});

test("journey cover transport supports both bounded cover uploads", () => {
  assert.match(
    bannerStorage,
    /ANNOUNCEMENT_BANNER_MAX_BYTES = 4 \* 1024 \* 1024/u,
  );
  assert.match(
    saveService,
    /selectedFile\(formData, "card_background_file"\)/u,
  );
  assert.match(
    saveService,
    /selectedFile\(formData, "featured_background_file"\)/u,
  );
  assert.match(
    nextConfig,
    /serverActions:\s*\{\s*[\s\S]*?bodySizeLimit: "9mb"/u,
  );
});
