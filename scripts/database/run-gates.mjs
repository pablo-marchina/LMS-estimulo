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

function runSqlSuite(label, files) {
  const args = ["--dbname", databaseUrl, "--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
  for (const file of files) args.push("--file", path.join(root, file));
  run("psql", args, label, { PGOPTIONS: "-c client_min_messages=warning" });
}

runNpm("validate:migration-history");
runNpm("replay:database-clean");
runNpm("validate:schema-equivalence");
runNpm("validate:public-rpc-contracts");
runNode("scripts/database/backend-e2e/run-backend-e2e.mjs", "backend end-to-end replay");

const suites = [
  ["configurable product persistence", [
    "scripts/database/configurable-product-persistence/operational-persistence.sql",
    "scripts/database/configurable-product-persistence/test-persistence.sql",
  ]],
  ["activity comments", ["scripts/database/activity-comments/test-activity-comments.sql"]],
  ["participant contact details", ["scripts/database/participant-contact-details/test-participant-contact-details.sql"]],
  ["practice uploads", [
    "supabase/migrations/20260715143709_practice_uploads_schema.sql",
    "supabase/migrations/20260715143808_practice_uploads_participant_api.sql",
    "supabase/migrations/20260715143842_practice_uploads_operator_api.sql",
    "scripts/database/practice-uploads/test-practice-uploads.sql",
  ]],
  ["learning credentials", [
    "supabase/migrations/20260715155144_learning_credentials_schema.sql",
    "supabase/migrations/20260715155610_learning_credentials_context.sql",
    "supabase/migrations/20260715155647_learning_credentials_candidates.sql",
    "supabase/migrations/20260715155753_learning_credentials_issuance_api.sql",
    "supabase/migrations/20260715155834_learning_credentials_read_api.sql",
    "supabase/migrations/20260715161140_learning_credentials_verify_hardening.sql",
    "scripts/database/learning-credentials/test-learning-credentials.sql",
  ]],
  ["content library", [
    "scripts/database/content-library/schema.sql",
    "scripts/database/content-library/api.sql",
    "scripts/database/content-library/event-versioning.sql",
    "scripts/database/content-library/hardening.sql",
    "scripts/database/content-library/test-content-library.sql",
  ]],
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
  ["admin product management", ["scripts/database/admin-product-management/test-admin-product-management.sql"]],
];

for (const [label, files] of suites) runSqlSuite(label, files);

process.stdout.write("\n[database-gates] all database gates passed\n");
