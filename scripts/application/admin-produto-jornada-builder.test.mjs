import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("jornada form lets an admin add and reorder trilhas without typing an id", () => {
  assert.match(page, /Adicionar trilha/u);
  assert.doesNotMatch(page, /path_template_id"\s+placeholder/u);
});

test("jornada form no longer has a standalone Trilha e bloco section for creating trilhas", () => {
  assert.doesNotMatch(page, /Nova trilha<\/option>/u);
});

test("save action forwards trilha fields to the path_template resource type", () => {
  assert.match(actions, /resourceType:\s*"path_template"/u);
});
