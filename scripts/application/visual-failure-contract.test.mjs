import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = await readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8");

test("composition failures fail the process", () => {
  assert.match(audit, /if \(report\.failures\.length\)/u);
  assert.match(audit, /process\.exitCode = 1/u);
});
