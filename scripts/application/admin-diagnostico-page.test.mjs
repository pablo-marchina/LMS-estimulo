import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/diagnostico/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8");

test("diagnostic editor uses structured fields instead of raw JSON textareas", () => {
  assert.doesNotMatch(page, /name="dimensions"/u);
  assert.doesNotMatch(page, /name="items"/u);
  assert.doesNotMatch(page, /name="archetypes"/u);
  assert.doesNotMatch(page, /name="configuration"/u);
  assert.match(page, /AdminDisclosure title="Dimensões avaliadas"/u);
  assert.match(page, /AdminDisclosure title="Perguntas"/u);
  assert.match(page, /AdminDisclosure title="Regras de classificação"/u);
});

test("diagnostic editor keeps publication behind an explicit methodological review choice", () => {
  assert.match(page, /Mantenha como rascunho durante a revisão metodológica/u);
  assert.match(page, /name="status" value="published"/u);
  assert.match(page, /Versões publicadas não aparecem aqui/u);
});

test("diagnostic editor exposes a default-archetype fallback selector", () => {
  assert.match(page, /name="default_archetype_code"/u);
  for (const code of ["fazedor", "batalhador", "construtor", "navegador"]) {
    assert.match(page, new RegExp(`value="${code}"`, "u"));
  }
});

test("save action builds structured diagnostic collections without parsing one opaque JSON field", () => {
  assert.doesNotMatch(actions, /json\(formData, "dimensions"/u);
  assert.doesNotMatch(actions, /json\(formData, "items"/u);
  assert.doesNotMatch(actions, /json\(formData, "archetypes"/u);
  assert.match(actions, /classification_rules/u);
});
