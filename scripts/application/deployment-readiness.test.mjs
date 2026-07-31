import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [dockerfile, nextConfig, live, ready, contract, architectureStatus] = await Promise.all([
  readFile("Dockerfile.lambda", "utf8"),
  readFile("apps/web/next.config.ts", "utf8"),
  readFile("apps/web/app/api/health/live/route.ts", "utf8"),
  readFile("apps/web/app/api/health/ready/route.ts", "utf8"),
  readFile("config/platform/aws-production.json", "utf8"),
  readFile("docs/architecture/AWS_ARCHITECTURE_STATUS.md", "utf8"),
]);

test("the only application image is pinned, standalone and non-root", () => {
  assert.match(dockerfile, /node:22\.23\.1-bookworm-slim@sha256:[a-f0-9]{64}/u);
  assert.match(dockerfile, /npm ci --ignore-scripts --no-audit --no-fund/u);
  assert.match(dockerfile, /npm run build:web/u);
  assert.match(dockerfile, /PLATFORM_RUNTIME_PROVIDER=aws/u);
  assert.match(dockerfile, /USER 10001:10001/u);
  assert.match(dockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/live/u);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY|CPF_ENCRYPTION_KEY|ETL_DESTINATION_TOKEN/u);
  assert.match(nextConfig, /output: "standalone"/u);
});

test("liveness checks only the process while dependency readiness fails closed", () => {
  assert.match(live, /status: "ok"/u);
  assert.doesNotMatch(live, /createPrivilegedClient|rpc\(/u);
  assert.match(ready, /assertPlatformRuntimePolicy/u);
  assert.match(ready, /get_application_readiness/u);
  assert.match(ready, /function response\([\s\S]*status = 503/u);
  assert.match(ready, /return response\("aws_architecture_pending"/u);
  assert.match(ready, /cache-control/u);
  assert.doesNotMatch(ready, /error\.message|JSON\.stringify\(process\.env/u);
});

test("AWS production remains explicitly undecided except for the Lambda container", () => {
  const parsed = JSON.parse(contract);
  assert.equal(parsed.runtime_provider, "aws");
  assert.equal(parsed.compute, "lambda_container");
  assert.equal(parsed.architecture_status, "decision_pending");
  assert.equal(parsed.supabase_allowed, false);
  assert.equal(parsed.vercel_allowed, false);
  assert.equal(parsed.implementation.production_ready, false);
  assert.match(architectureStatus, /Dockerfile\.lambda/u);
  assert.match(architectureStatus, /decisões de arquitetura de produção pendentes/iu);
  assert.match(architectureStatus, /entrada pública/u);
  assert.match(architectureStatus, /identidade/u);
  assert.match(architectureStatus, /banco transacional/u);
  assert.match(architectureStatus, /processamento assíncrono/u);
  assert.match(architectureStatus, /backup, restore e rollback/u);
});

test("the repository does not contain the removed premature AWS infrastructure tree", async () => {
  await assert.rejects(
    readFile("infra/aws/terraform/main.tf", "utf8"),
    (error) => error?.code === "ENOENT",
  );
});
