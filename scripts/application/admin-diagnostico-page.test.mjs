import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/diagnostico/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8");

test("diagnostic editor no longer has raw JSON textareas for dimensions/items/archetypes/configuration", () => {
  assert.doesNotMatch(page, /name="dimensions"/u);
  assert.doesNotMatch(page, /name="items"/u);
  assert.doesNotMatch(page, /name="archetypes"/u);
  assert.doesNotMatch(page, /name="configuration"/u);
  assert.doesNotMatch(page, /Dimensões JSON/u);
  assert.doesNotMatch(page, /Perguntas e opções JSON/u);
});

test("diagnostic editor shows the draft-pending-approval banner", () => {
  assert.match(page, /pendente de aprova[cç][aã]o institucional/iu);
});

test("diagnostic editor has a publish control and a default-archetype fallback selector", () => {
  assert.match(page, /name="status"/u);
  assert.match(page, /name="default_archetype_code"/u);
});

test("save action builds dimensions/items/archetypes/classification_rules arrays from structured fields, not JSON.parse of a single textarea", () => {
  assert.doesNotMatch(actions, /json\(formData, "dimensions"/u);
  assert.doesNotMatch(actions, /json\(formData, "items"/u);
  assert.doesNotMatch(actions, /json\(formData, "archetypes"/u);
  assert.match(actions, /classification_rules/u);
});
