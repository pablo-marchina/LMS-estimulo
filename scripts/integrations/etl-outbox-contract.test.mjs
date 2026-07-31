import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

const [outbox, dataFlow, environment, suiteDocument, packageFile] = await Promise.all([
  read("docs/architecture/TRANSACTIONAL_OUTBOX.md"),
  read("docs/dataflows/DATA_FLOW_ARCHITECTURE.md"),
  read(".env.example"),
  read("docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md"),
  read("package.json"),
]);

async function textFiles(relative) {
  const absolute = path.join(root, relative);
  const info = await stat(absolute);
  if (info.isFile()) return [relative];
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? textFiles(next) : [next];
  }));
  return nested.flat().filter((file) => /\.(?:md|mjs|mts|ts|tsx|js|json|yaml|yml)$/u.test(file));
}

test("ETL remains destination-neutral and disabled by default", () => {
  assert.match(environment, /ETL_EXPORT_ENABLED=false/u);
  assert.match(environment, /ETL_DESTINATION_URL=/u);
  assert.match(suiteDocument, /outbox genérica/u);
  assert.match(suiteDocument, /destino externo/u);
});

test("outbox contract preserves idempotency, retry and reconciliation", () => {
  for (const term of [/idempot/iu, /retry/iu, /reconcil/iu]) {
    assert.ok(term.test(outbox) || term.test(dataFlow), `missing ETL contract term: ${term}`);
  }
});

test("active runtime and configuration contain no CRM-specific dependency", async () => {
  const activeRoots = [
    "apps/web/app",
    "apps/web/components",
    "apps/web/lib",
    "supabase/functions",
    ".env.example",
    "package.json",
    "README.md",
    "PROJECT_INDEX.md",
    "CONTRIBUTING.md",
    "docs/architecture/TRANSACTIONAL_OUTBOX.md",
    "docs/dataflows/DATA_FLOW_ARCHITECTURE.md",
    "docs/implementation/PLATFORM_GROWTH_ENGAGEMENT_SUITE.md",
  ];
  const files = (await Promise.all(activeRoots.map(textFiles))).flat();
  const matches = [];
  for (const file of files) {
    const content = await read(file);
    if (/hubspot/iu.test(content)) matches.push(file);
  }
  assert.deepEqual(matches, [], `CRM-specific operational references remain in: ${matches.join(", ")}`);
  assert.doesNotMatch(packageFile, /hubspot/iu);
  assert.match(packageFile, /etl-outbox-contract\.test\.mjs/u);
});
