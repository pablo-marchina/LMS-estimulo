import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [journeyPage, certificateTemplates, compositionAudit, visualWorkflow] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/app/admin/gamificacao/certificate-template-manager.tsx", "utf8"),
  readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("selected lesson keeps hero, learning path and lesson in one explicit column", () => {
  assert.match(journeyPage, /data-journey-outline-page/u);
  assert.match(journeyPage, /grid-cols-1/u);
  assert.match(journeyPage, /data-journey-hero/u);
  assert.match(journeyPage, /data-journey-learning-path/u);
  assert.match(journeyPage, /id="aula" data-journey-lesson className="min-w-0/u);
});

test("certificate template grids shrink instead of creating implicit mobile min-content tracks", () => {
  assert.match(certificateTemplates, /id="templates-certificado" className="grid min-w-0 max-w-full grid-cols-\[minmax\(0,1fr\)\]/u);
  assert.match(certificateTemplates, /Card className="grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3"/u);
  assert.match(certificateTemplates, /flex min-w-0 max-w-full flex-col/u);
});

test("visual audit discovers the current dynamic lesson state and fails broken composition", () => {
  assert.match(compositionAudit, /form:has\(input\[name="journey_instance_id"\]\)/u);
  assert.match(compositionAudit, /step_status\]\[value="completed"\]/u);
  assert.match(compositionAudit, /\?conteudo=\$\{encodeURIComponent\(stepInstanceId\)\}#aula/u);
  assert.match(compositionAudit, /selected lesson state did not render #aula/u);
  assert.match(compositionAudit, /laterally displaced/u);
  assert.match(compositionAudit, /unnaturally narrow/u);
  assert.match(compositionAudit, /selected lesson state has horizontal overflow/u);
  assert.match(compositionAudit, /\/admin\/certificados/u);
  assert.match(compositionAudit, /\/admin\/gamificacao\?tipo=certificados/u);
  assert.match(compositionAudit, /process\.exitCode = 1/u);
  assert.doesNotMatch(compositionAudit, /const (?:journeyInstanceId|stepInstanceId)\s*=\s*["'][0-9a-f-]{36}/u);
});

test("production visual workflow executes the composition audit", () => {
  assert.match(visualWorkflow, /production-visual-composition-audit\.mjs/u);
  assert.match(visualWorkflow, /Audit dynamic states and visual composition/u);
});
