import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = await readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8");

test("authenticated overflow warnings are fatal in the composition audit", () => {
  assert.match(audit, /existing visual crawl reported authenticated overflow/u);
});
