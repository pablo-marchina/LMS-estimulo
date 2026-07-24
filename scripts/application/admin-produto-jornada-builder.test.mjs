import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");
const journeyAction = await readFile("apps/web/app/admin/produto/journey-action.ts", "utf8");
const publishAction = await readFile("apps/web/app/admin/produto/publish-action.ts", "utf8");

test("jornada form lets an admin add trilhas without typing an id", () => {
  assert.match(page, /Adicionar trilha/u);
  assert.doesNotMatch(page, /path_template_id"\s+placeholder/u);
});

test("guided builder never exposes code, slug, ids, or raw JSON fields", () => {
  assert.doesNotMatch(page, />Código</u);
  assert.doesNotMatch(page, />Slug</u);
  assert.doesNotMatch(page, /Configuração JSON/u);
  assert.doesNotMatch(page, /ID do passo/u);
  assert.doesNotMatch(page, /Expressão JSON/u);
});

test("server actions derive technical identifiers and forward trilha fields", () => {
  assert.match(journeyAction, /deriveCode/u);
  assert.match(actions, /resourceType:\s*"path_template"/u);
});

test("builder exposes a validated publication stage", () => {
  assert.match(page, /Validar e publicar/u);
  assert.match(publishAction, /publishAdminJourneyVersion/u);
  assert.match(publishAction, /journey\.definition\.publish/u);
});
