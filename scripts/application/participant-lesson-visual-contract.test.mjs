import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [journeyPage, compositionAudit, visualWorkflow] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("journey and selected lesson remain in one explicit responsive column", () => {
  assert.match(journeyPage, /data-journey-outline-page/u);
  assert.match(journeyPage, /grid-cols-1/u);
  assert.match(journeyPage, /data-journey-hero/u);
  assert.match(journeyPage, /data-journey-learning-path/u);
  assert.match(journeyPage, /data-journey-lesson/u);
  assert.match(journeyPage, /id="aula"[^>]*min-w-0/u);
});

test("production visual audit must open a real completed lesson state and validate composition", () => {
  assert.match(compositionAudit, /form:has\(input\[name="journey_instance_id"\]\)/u);
  assert.match(compositionAudit, /step_status\]\[value="completed"\]/u);
  assert.match(compositionAudit, /\?conteudo=\$\{encodeURIComponent\(stepInstanceId\)\}#aula/u);
  assert.match(compositionAudit, /selected lesson state did not render #aula/u);
  assert.match(compositionAudit, /laterally displaced/u);
  assert.match(compositionAudit, /unnaturally narrow/u);
  assert.match(compositionAudit, /#aula fragment did not land near the top/u);
  assert.match(compositionAudit, /selected lesson state has horizontal overflow/u);
});

test("authenticated visual overflows are promoted from warnings to failing composition gates", () => {
  assert.match(compositionAudit, /existing visual crawl reported authenticated overflow/u);
  assert.match(compositionAudit, /admin mobile \/admin\/certificados: horizontal overflow/u);
  assert.match(visualWorkflow, /Audit dynamic states and visual composition/u);
  assert.match(visualWorkflow, /production-visual-composition-audit\.mjs/u);
});
