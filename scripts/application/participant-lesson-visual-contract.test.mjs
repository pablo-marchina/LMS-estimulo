import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [journeyPage, compositionAudit, visualWorkflow, certificateTemplates] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
  readFile("apps/web/app/admin/gamificacao/certificate-template-manager.tsx", "utf8"),
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

test("certificate template grids cannot grow an implicit mobile min-content column", () => {
  assert.match(certificateTemplates, /id="templates-certificado"[^>]*grid-cols-\[minmax\(0,1fr\)\]/u);
  assert.match(certificateTemplates, /Card className="grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3"/u);
  assert.match(certificateTemplates, /article key=\{text\(assignment\.id\)\} className="flex min-w-0 max-w-full/u);
  assert.match(certificateTemplates, /grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3 p-3/u);
});

test("authenticated visual overflows are promoted from warnings to failing composition gates", () => {
  assert.match(compositionAudit, /existing visual crawl reported authenticated overflow/u);
  assert.match(compositionAudit, /admin mobile \/admin\/certificados: horizontal overflow/u);
  assert.match(visualWorkflow, /Audit dynamic states and visual composition/u);
  assert.match(visualWorkflow, /production-visual-composition-audit\.mjs/u);
});
