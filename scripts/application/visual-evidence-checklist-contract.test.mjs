import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const checklist = await readFile("docs/reviews/visual-evidence-checklist.md", "utf8");

test("visual completion checklist requires exact state, responsive evidence and manual review", () => {
  assert.match(checklist, /estado exato do bug foi aberto no navegador/u);
  assert.match(checklist, /Desktop e mobile/u);
  assert.match(checklist, /Não há overflow horizontal autenticado/u);
  assert.match(checklist, /capturas do crawler amplo foram inspecionadas visualmente/u);
  assert.match(checklist, /warning visual é classificado individualmente/u);
});
