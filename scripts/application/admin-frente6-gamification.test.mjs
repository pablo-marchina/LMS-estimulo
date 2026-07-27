import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/gamificacao/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/gamificacao/actions.ts", "utf8");

test("gamification page uses human frequency and validity fields", () => {
  assert.match(page, /Pontos por ação/u);
  assert.match(page, /Quando a pessoa pode receber/u);
  assert.match(page, /Quantidade de meses/u);
  assert.doesNotMatch(page, /name="code"/u);
  assert.doesNotMatch(page, /recurrence_policy|validity_policy/u);
  assert.doesNotMatch(page, /JSON/u);
});

test("server action assembles technical policies from guided values", () => {
  assert.match(actions, /recurrencePolicy/u);
  assert.match(actions, /validityPolicy/u);
  assert.match(actions, /deriveCode/u);
  assert.match(actions, /recurrence_policy:\s*recurrencePolicy/u);
  assert.match(actions, /validity_policy:\s*validityPolicy/u);
  assert.doesNotMatch(actions, /JSON\.parse/u);
});
