import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [page, action, lifecycle] = await Promise.all([
  readFile("apps/web/app/admin/produto/page.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/retire-journey-action.ts", "utf8"),
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
  assert.match(action, /isEstimuloAdministrativeEmail/u);
  assert.match(action, /journey\.definition\.manage/u);
  assert.match(action, /confirmation !== "ARQUIVAR"/u);
  assert.match(action, /retireAdminJourney/u);
  assert.match(action, /revalidatePath\("\/empreendedor", "layout"\)/u);
  assert.match(lifecycle, /p_resource_type: "journey_retire"/u);
});
