import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scope = await readFile("docs/reviews/visual-audit-scope.md", "utf8");

test("visual coverage requires the exact dynamic state rather than only its parent route", () => {
  assert.match(scope, /not considered visually validated merely because its parent route was captured/u);
  assert.match(scope, /expected state marker must render/u);
});
