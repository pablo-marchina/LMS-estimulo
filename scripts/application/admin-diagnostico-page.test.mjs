import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/diagnostico/page.tsx", "utf8");
const principalSection = await readFile("apps/web/app/admin/diagnostico/principal-section.tsx", "utf8");
const builder = await readFile("apps/web/app/admin/diagnostico/diagnostic-builder.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/diagnostico/actions.ts", "utf8");

const editorSource = `${page}\n${principalSection}\n${builder}`;

test("diagnostic editor uses structured dynamic fields instead of raw JSON textareas", () => {
  assert.doesNotMatch(editorSource, /name="dimensions"/u);
  assert.doesNotMatch(editorSource, /name="items"/u);
  assert.doesNotMatch(editorSource, /name="archetypes"/u);
  assert.doesNotMatch(editorSource, /name="configuration"/u);
  assert.match(builder, /AdminDisclosure title="Dimensões avaliadas"/u);
  assert.match(builder, /AdminDisclosure title="Perguntas"/u);
  assert.match(builder, /AdminDisclosure title="Regras de classificação"/u);
  assert.match(builder, /Adicionar perfil/u);
  assert.match(builder, /Adicionar dimensão/u);
});

test("diagnostic editor keeps publication behind an explicit migration choice", () => {
  assert.match(page, /PrincipalDiagnosticSection/u);
  assert.match(principalSection, /Somente um diagnóstico permanece publicado por vez/u);
  assert.match(principalSection, /DiagnosticBuilder/u);
  assert.match(builder, /Publicar agora/u);
  assert.match(builder, /Migração dos perfis atuais/u);
  assert.match(builder, /mapping_target_code_/u);
  assert.match(actions, /mapeamento_incompleto/u);
});

test("diagnostic editor exposes configurable profiles and a required fallback selector", () => {
  assert.match(builder, /name="default_archetype_code"/u);
  assert.match(builder, /profiles\.map/u);
  assert.match(builder, /addProfile/u);
  assert.match(builder, /removeProfile/u);
  assert.doesNotMatch(builder, /const ARCHETYPES/u);
  assert.doesNotMatch(builder, /fazedor.*batalhador.*construtor.*navegador/su);
});

test("save action builds structured diagnostic collections without parsing one opaque JSON field", () => {
  assert.doesNotMatch(actions, /json\(formData, "dimensions"/u);
  assert.doesNotMatch(actions, /json\(formData, "items"/u);
  assert.doesNotMatch(actions, /json\(formData, "archetypes"/u);
  assert.match(actions, /classification_rules/u);
  assert.match(actions, /archetype_codes: profiles\.map/u);
  assert.match(actions, /publishAdminDiagnosticTransition/u);
});
