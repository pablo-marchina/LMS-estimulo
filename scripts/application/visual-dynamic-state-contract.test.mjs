import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = await readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8");

test("dynamic lesson visual state is discovered from current rendered forms", () => {
  assert.match(audit, /journey_instance_id/u);
  assert.match(audit, /step_instance_id/u);
  assert.match(audit, /step_status\]\[value="completed"\]/u);
});
