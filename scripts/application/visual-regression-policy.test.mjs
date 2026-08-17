import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = await readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8");

test("authenticated overflow warnings become release-blocking failures", () => {
  assert.match(audit, /existing visual crawl reported authenticated overflow/u);
  assert.match(audit, /process\.exitCode = 1/u);
});
