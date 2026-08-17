import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [compositionAudit, visualWorkflow] = await Promise.all([
  readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("visual approval requires rendering the dynamic selected-lesson state", () => {
  assert.match(compositionAudit, /no enrolled journey was rendered; dynamic lesson coverage cannot run/u);
  assert.match(compositionAudit, /no completed activity exists in the discovered journey/u);
  assert.match(compositionAudit, /selected lesson state did not render #aula/u);
  assert.doesNotMatch(compositionAudit, /const journeyInstanceId\s*=\s*["'][0-9a-f-]{36}/u);
  assert.doesNotMatch(compositionAudit, /const stepInstanceId\s*=\s*["'][0-9a-f-]{36}/u);
});

test("authenticated horizontal overflow can no longer be a passing warning", () => {
  assert.match(compositionAudit, /existing visual crawl reported authenticated overflow/u);
  assert.match(compositionAudit, /process\.exitCode = 1/u);
  assert.match(visualWorkflow, /Audit dynamic states and visual composition/u);
  assert.match(visualWorkflow, /if: always\(\)/u);
});

test("visual workflow keeps desktop and mobile evidence after composition checks", () => {
  assert.match(compositionAudit, /key: "desktop", width: 1440, height: 1000/u);
  assert.match(compositionAudit, /key: "mobile", width: 390, height: 844/u);
  assert.match(compositionAudit, /participant-lesson-open-\$\{viewport\.key\}-viewport\.png/u);
  assert.match(compositionAudit, /participant-lesson-open-\$\{viewport\.key\}-full\.png/u);
  assert.match(visualWorkflow, /visual-composition-report\.json/u);
});
