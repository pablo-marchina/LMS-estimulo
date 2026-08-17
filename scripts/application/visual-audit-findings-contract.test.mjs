import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const findings = await readFile("docs/reviews/visual-audit-findings-20260816.md", "utf8");

test("previous visual warnings are explicitly classified", () => {
  assert.match(findings, /Participant selected lesson desktop/u);
  assert.match(findings, /\/admin\/certificados.*433 px document in a 390 px viewport/u);
  assert.match(findings, /\/admin\/gamificacao\?tipo=certificados/u);
});
