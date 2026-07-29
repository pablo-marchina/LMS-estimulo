import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const [lambdaDockerfile, environmentExample, decision, targetArchitecture, runtimeProvider] = await Promise.all([
  read("Dockerfile.lambda"),
  read(".env.example"),
  read("docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md"),
  read("docs/architecture/AWS_TARGET_ARCHITECTURE.md"),
  read("apps/web/lib/platform/runtime-provider.ts"),
]);

assert.match(lambdaDockerfile, /PLATFORM_RUNTIME_PROVIDER=aws/, "Lambda image must select the AWS runtime provider");
assert.match(lambdaDockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/ready/, "Lambda startup must use fail-closed readiness");
assert.doesNotMatch(lambdaDockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/live/, "Lambda must not treat liveness as readiness");
assert.match(lambdaDockerfile, /AWS_LWA_ERROR_STATUS_CODES=500-599/, "Lambda Web Adapter must surface server failures");

assert.match(environmentExample, /PLATFORM_RUNTIME_PROVIDER=supabase/, "Development example must explicitly select Supabase");
assert.match(environmentExample, /# Production requires PLATFORM_RUNTIME_PROVIDER=aws/, "Environment example must document the production policy");

assert.match(decision, /Supabase permanece autorizado somente para desenvolvimento/, "AWS production decision must keep Supabase outside production");
assert.match(decision, /RDS Proxy/, "AWS production decision must include RDS Proxy");
assert.match(decision, /Amazon S3/, "AWS production decision must include S3");
assert.match(decision, /Amazon SQS/, "AWS production decision must include SQS workers");
assert.match(targetArchitecture, /Arquitetura canônica/, "Target architecture must declare one canonical architecture");
assert.doesNotMatch(targetArchitecture, /opções de compute/i, "Target architecture must not present competing production compute options");

assert.match(runtimeProvider, /PRODUCTION_REQUIRES_AWS_RUNTIME/, "Runtime must reject Supabase in production");
assert.match(runtimeProvider, /PLATFORM_RUNTIME_PROVIDER_INVALID/, "Runtime provider must fail closed on invalid values");

process.stdout.write("[platform-contract] AWS production architecture is internally consistent\n");
