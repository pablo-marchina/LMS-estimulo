import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const builder = await readFile("apps/web/app/admin/produto/trilha-aula-builder.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("trilha block offers an intuitive add-aula flow with prompts, quiz, and practice fields", () => {
  assert.match(page, /TrilhaAulaBuilder/u);
  assert.match(builder, /Adicionar aula/u);
  assert.match(builder, /Esta aula encerra a trilha/u);
  assert.match(builder, /practice_checklist/u);
  assert.match(builder, /quiz_correct_/u);
});

test("save action assembles structured assessment and practice payloads", () => {
  assert.match(actions, /assessment:\s*\{ questions \}/u);
  assert.match(actions, /is_correct:/u);
  assert.match(actions, /activity_type: isClosing \? "practice" : "content"/u);
  assert.match(actions, /practice_checklist: checklist/u);
});

test("nested builder preserves journey context and does not expose raw ids", () => {
  assert.match(builder, /journey_version_id/u);
  assert.match(builder, /path_template_id/u);
  assert.doesNotMatch(builder, /ID do passo existente/u);
  assert.doesNotMatch(page, /Trilha e bloco/u);
  assert.doesNotMatch(page, /Atividade e conteúdo/u);
});
