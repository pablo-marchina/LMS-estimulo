import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const [
  packageSource,
  nodeVersion,
  nvmVersion,
  dockerfile,
  nextConfig,
  proxy,
  gateway,
  edgeFunction,
  edgeDeno,
  webCi,
  reproducibility,
  dependabot,
  migration,
  environmentExample,
  migrationInventory,
  rpcCoverage,
] = await Promise.all([
  read("package.json"),
  read(".node-version"),
  read(".nvmrc"),
  read("Dockerfile.lambda"),
  read("apps/web/next.config.ts"),
  read("apps/web/proxy.ts"),
  read("apps/web/lib/rpc/authenticated-gateway.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("supabase/functions/authenticated-rpc/deno.json"),
  read(".github/workflows/web-ci.yml"),
  read(".github/workflows/reproducibility.yml"),
  read(".github/dependabot.yml"),
  read("supabase/migrations/20260729203000_m17_runtime_hardening.sql"),
  read(".env.example"),
  read("scripts/database/migration-history/validate-active-migrations.mjs"),
  read("scripts/runtime/validate-rpc-gateway-coverage.mjs"),
]);

const packageJson = JSON.parse(packageSource);
assert.equal(packageJson.packageManager, "npm@10.9.8");
assert.equal(nodeVersion.trim(), "22.23.1");
assert.equal(nvmVersion.trim(), "22.23.1");
for (const script of [
  "validate:runtime-hardening",
  "validate:rpc-gateway-coverage",
  "validate:release-candidate",
  "build:release-manifest",
  "test:capacity",
  "verify:http-hardening",
]) {
  assert.equal(typeof packageJson.scripts?.[script], "string", `missing package script ${script}`);
}

assert.match(dockerfile, /node:22\.23\.1-bookworm-slim@sha256:[0-9a-f]{64}/);
assert.match(dockerfile, /test "\$\(npm --version\)" = "10\.9\.8"/);
assert.match(dockerfile, /USER 10001:10001/);
assert.match(dockerfile, /HEALTHCHECK/);
assert.match(dockerfile, /CMD \["node", "apps\/web\/server\.js"\]/);
assert.match(dockerfile, /SOURCE_VERSION/);
assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
assert.doesNotMatch(dockerfile, /CMD \["sh", "-c"/);

for (const header of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
]) assert.ok(nextConfig.includes(header), `security header missing: ${header}`);
assert.match(nextConfig, /frame-ancestors 'none'/);
assert.match(nextConfig, /object-src 'none'/);

assert.match(proxy, /if \(!protectedPath\)/, "public routes must avoid unnecessary Auth calls");
assert.match(proxy, /clearSupabaseAuthCookies/);
assert.match(proxy, /x-request-id/);
assert.match(proxy, /server-timing/);
assert.match(proxy, /private, no-store/);

for (const marker of [
  "RPC_GATEWAY_MAX_PAYLOAD_BYTES",
  "RPC_GATEWAY_MAX_CONCURRENCY",
  "RPC_GATEWAY_MAX_QUEUE",
  "RPC_GATEWAY_QUEUE_TIMEOUT_MS",
  "RPC_GATEWAY_TIMEOUT_MS",
  "RPC_GATEWAY_OVERLOADED",
  "request_started",
  "request_completed",
]) assert.ok(gateway.includes(marker), `gateway hardening missing: ${marker}`);

assert.match(edgeFunction, /npm:@supabase\/supabase-js@2\.110\.2/);
assert.doesNotMatch(edgeFunction, /jsr:@supabase\/functions-js\/edge-runtime\.d\.ts/);
for (const marker of [
  "AUTHENTICATED_RPC_MAX_BODY_BYTES",
  "AUTHENTICATED_RPC_UPSTREAM_TIMEOUT_MS",
  "AUTHENTICATED_RPC_BURST_LIMIT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "RATE_LIMITED",
  "rpcFailure",
  "server-timing",
  "x-request-id",
  "readBodyWithLimit",
  "clear_admin_activity_parts",
  "create_admin_journey_draft_from_version",
  "get_admin_journey_editor_details",
  "save_admin_path_badge",
]) assert.ok(edgeFunction.includes(marker), `Edge RPC hardening missing: ${marker}`);
assert.doesNotMatch(edgeFunction, /message:\s*error\.message/);
assert.equal(JSON.parse(edgeDeno).compilerOptions.strict, true);
assert.match(rpcCoverage, /RPCs invoked by the application are missing from the authenticated gateway/);

for (const workflow of [webCi, reproducibility]) {
  assert.match(workflow, /push:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node-version: "22\.23\.1"/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d/u, "Actions must be pinned by commit SHA");
}
assert.match(webCi, /validate:runtime-hardening/);
assert.match(webCi, /verify:http-hardening/);
assert.match(webCi, /test:capacity/);
assert.match(webCi, /build:release-manifest/);
assert.match(webCi, /aquasecurity\/trivy-action@[0-9a-f]{40}/);
assert.match(webCi, /severity: CRITICAL,HIGH/);
assert.match(webCi, /\.Config\.User/);
assert.doesNotMatch(webCi, /--provenance=false/);
assert.match(reproducibility, /windows-latest/);
assert.match(reproducibility, /ubuntu-latest/);
assert.match(dependabot, /package-ecosystem: npm/);
assert.match(dependabot, /package-ecosystem: github-actions/);

for (const column of [
  "file_object_id",
  "entrepreneur_id",
  "queued_sync_job_id",
  "resolved_by_user_account_id",
  "source_event_id",
  "user_account_id",
  "content_asset_id",
]) assert.ok(migration.includes(column), `covering index migration missing ${column}`);
assert.equal((migration.match(/create index if not exists/gu) ?? []).length, 8);
for (const file of [
  "20260729190031_generic_journey_version_editor.sql",
  "20260729190353_generic_journey_editor_assessment_details.sql",
  "20260729190547_generic_journey_path_badge_editor.sql",
  "20260729191801_generic_journey_editor_event_schemas.sql",
  "20260729192423_generic_journey_path_badge_removal.sql",
  "20260729193313_generic_journey_path_presentation_event_schema.sql",
  "20260729203000_m17_runtime_hardening.sql",
  "20260729204500_interface_content_cms.sql",
  "20260729205000_replace_opaque_dimension_scores.sql",
]) assert.ok(migrationInventory.includes(file), `final release migration missing from inventory: ${file}`);

for (const name of [
  "READINESS_DATABASE_TIMEOUT_MS",
  "RPC_GATEWAY_MAX_PAYLOAD_BYTES",
  "RPC_GATEWAY_MAX_CONCURRENCY",
  "RPC_GATEWAY_MAX_QUEUE",
  "RPC_GATEWAY_QUEUE_TIMEOUT_MS",
  "AUTHENTICATED_RPC_MAX_BODY_BYTES",
  "AUTHENTICATED_RPC_UPSTREAM_TIMEOUT_MS",
  "AUTHENTICATED_RPC_BURST_LIMIT",
  "AUTHENTICATED_RPC_BURST_WINDOW_MS",
]) assert.ok(environmentExample.includes(name), `.env.example missing ${name}`);

process.stdout.write("[runtime-hardening] final release integrity, reproducibility, security, performance and capacity controls are present\n");
