import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

function run(command, args, label, extraEnv = {}) {
  process.stdout.write(`\n[database-gates] ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with status ${result.status}`);
}

function runNpm(script) {
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], script);
}

function runNode(file, label) {
  run(process.execPath, [file], label);
}

function assertTestSql(relativeFile) {
  const normalized = relativeFile.replaceAll("\\", "/");
  const filename = path.posix.basename(normalized);
  if (!normalized.startsWith("scripts/database/") || !filename.startsWith("test-") || !filename.endsWith(".sql")) {
    throw new Error(`DATABASE_GATE_NON_TEST_SQL_FORBIDDEN:${normalized}`);
  }
}

function runSqlTestSuite(label, files) {
  for (const file of files) assertTestSql(file);
  const args = ["--dbname", databaseUrl, "--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  for (const file of files) args.push("--file", path.join(root, file));
  run("psql", args, label, { PGOPTIONS: "-c client_min_messages=warning" });
}

// Build the database exactly once from the canonical immutable migration history.
// Every later suite is assertion-only and may not modify the implementation schema.
// These foundational stages remain fail-fast because later suites are not meaningful
// if the database cannot be reconstructed or its public contracts have drifted.
runNpm("validate:migration-history");
runNpm("replay:database-clean");
runNpm("validate:schema-equivalence");
runNpm("validate:public-rpc-contracts");
runNode("scripts/database/backend-e2e/run-backend-e2e.mjs", "backend end-to-end replay");

const suites = [
  ["configurable product persistence", ["scripts/database/configurable-product-persistence/test-persistence.sql"]],
  ["activity comments", ["scripts/database/activity-comments/test-activity-comments.sql"]],
  ["participant contact details", ["scripts/database/participant-contact-details/test-participant-contact-details.sql"]],
  ["practice uploads", ["scripts/database/practice-uploads/test-practice-uploads.sql"]],
  ["learning credentials", [
    "scripts/database/learning-credentials/test-learning-credentials.sql",
    "scripts/database/learning-credentials/test-journey-completion-certificate-automation.sql",
  ]],
  ["content library", ["scripts/database/content-library/test-content-library.sql"]],
  ["RBAC role management", [
    "scripts/database/rbac-role-management/test-rbac-bootstrap.sql",
    "scripts/database/rbac-role-management/test-rbac-role-management.sql",
  ]],
  ["public signup", ["scripts/database/public-signup/test-public-signup.sql"]],
  ["business maturity draft", ["scripts/database/business-maturity-draft/test-business-maturity-draft.sql"]],
  ["business maturity preview", ["scripts/database/business-maturity-preview/test-business-maturity-preview.sql"]],
  ["activity utility ratings", ["scripts/database/activity-utility-ratings/test-activity-utility-ratings.sql"]],
  ["application readiness", ["scripts/database/application-readiness/test-application-readiness.sql"]],
  ["foreign-key covering indexes", ["scripts/database/fk-covering-indexes/test-fk-covering-indexes.sql"]],
  ["identity experience", ["scripts/database/identity-experience/test-identity-experience.sql"]],
  ["authentication hardening", ["scripts/database/auth-hardening/test-permanent-auth-hardening.sql"]],
  ["scanner removal", ["scripts/database/scanner-removal/test-scanner-removal.sql"]],
  ["admin product management", [
    "scripts/database/admin-product-management/test-admin-product-management.sql",
    "scripts/database/admin-product-management/test-linked-library-lesson-patch.sql",
    "scripts/database/admin-product-management/test-assessment-passing-score-patch.sql",
  ]],
];

const suiteFailures = [];
for (const [label, files] of suites) {
  try {
    runSqlTestSuite(label, files);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    suiteFailures.push({ label, message });
    process.stderr.write(`[database-gates] suite failed: ${label}: ${message}\n`);
  }
}

if (suiteFailures.length > 0) {
  throw new Error(`database domain suites failed:\n${suiteFailures.map(({ label, message }) => `- ${label}: ${message}`).join("\n")}`);
}

process.stdout.write("\n[database-gates] canonical migration replay and all assertion-only suites passed\n");
