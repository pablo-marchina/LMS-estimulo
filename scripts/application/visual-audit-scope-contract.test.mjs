import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(".github/workflows/production-visual-capture.yml", "utf8");

test("participant journey changes trigger visual tooling validation", () => {
  assert.match(workflow, /apps\/web\/app\/empreendedor\/jornada\/\[journeyInstanceId\]\/page\.tsx/u);
  assert.match(workflow, /scripts\/e2e\/production-visual-composition-audit\.mjs/u);
});
