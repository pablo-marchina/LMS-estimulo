import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const [outbox, dataFlow, environment, suiteDocument, packageFile] = await Promise.all([
  read("docs/architecture/TRANSACTIONAL_OUTBOX.md"),
  read("docs/dataflows/DATA_FLOW_ARCHITECTURE.md"),
  read(".env.example"),
  read("docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md"),
  read("package.json"),
]);

test("ETL remains destination-neutral and disabled by default", () => {
  assert.match(environment, /ETL_EXPORT_ENABLED=false/u);
  assert.match(environment, /ETL_DESTINATION_URL=/u);
  assert.doesNotMatch(environment, /HUBSPOT/iu);
  assert.match(suiteDocument, /outbox genérica/u);
  assert.match(suiteDocument, /destino externo específico/u);
});

test("outbox contract preserves idempotency, retry and reconciliation", () => {
  for (const term of [/idempot/iu, /retry/iu, /reconcil/iu]) {
    assert.ok(term.test(outbox) || term.test(dataFlow), `missing ETL contract term: ${term}`);
  }
});

test("integration gate no longer compiles CRM-specific adapters", () => {
  assert.doesNotMatch(packageFile, /hubspot/iu);
  assert.match(packageFile, /etl-outbox-contract\.test\.mjs/u);
});
