import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPlatformRuntimePolicyFor } from "../../apps/web/lib/platform/runtime-provider-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

const storageModules = [
  "apps/web/lib/storage/practice-evidence.ts",
  "apps/web/lib/storage/library-content.ts",
  "apps/web/lib/storage/credential-files.ts",
  "apps/web/lib/storage/announcement-banners.ts",
];

const [
  lambdaDockerfile,
  environmentExample,
  supabaseConfig,
  decision,
  targetArchitecture,
  runtimeProvider,
  buildConfiguration,
  publicOrigin,
  readiness,
  rpcGateway,
  authContext,
  proxy,
  objectStorage,
  supabaseServer,
  supabaseAdmin,
  supabaseVerification,
  databaseGates,
  packageSource,
  productionContractSource,
  ...featureStorageSources
] = await Promise.all([
  read("Dockerfile.lambda"),
  read(".env.example"),
  read("supabase/config.toml"),
  read("docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md"),
  read("docs/architecture/AWS_TARGET_ARCHITECTURE.md"),
  read("apps/web/lib/platform/runtime-provider.ts"),
  read("scripts/runtime/validate-production-config.mjs"),
  read("apps/web/lib/http-public-origin.ts"),
  read("apps/web/app/api/health/ready/route.ts"),
  read("apps/web/lib/rpc/authenticated-gateway.ts"),
  read("apps/web/lib/auth/context.ts"),
  read("apps/web/proxy.ts"),
  read("apps/web/lib/platform/object-storage.ts"),
  read("apps/web/lib/supabase/server.ts"),
  read("apps/web/lib/supabase/admin.ts"),
  read("scripts/verification/verify-supabase.mjs"),
  read("scripts/database/run-gates.mjs"),
  read("package.json"),
  read("config/platform/aws-production.json"),
  ...storageModules.map(read),
]);

const productionContract = JSON.parse(productionContractSource);
const packageJson = JSON.parse(packageSource);
assert.equal(productionContract.schema_version, "1.0");
assert.equal(productionContract.environment_class, "production");
assert.equal(productionContract.runtime_provider, "aws");
assert.equal(productionContract.compute, "lambda_container");
assert.equal(productionContract.front_door, "api_gateway_http_api");
assert.equal(productionContract.identity, "cognito_or_corporate_oidc_broker");
assert.equal(productionContract.database, "rds_postgresql_multi_az");
assert.equal(productionContract.database_access, "rds_proxy");
assert.equal(productionContract.storage, "s3_private_direct_upload");
assert.equal(productionContract.async_delivery, "postgres_outbox_sqs_lambda_dlq");
assert.equal(productionContract.supabase_allowed, false);
assert.equal(productionContract.corporate_resource_inventory_required, true);
assert.equal(productionContract.implementation.production_ready, false);

assert.equal(assertPlatformRuntimePolicyFor("development", "supabase"), "supabase");
assert.equal(assertPlatformRuntimePolicyFor("test", "supabase"), "supabase");
assert.equal(assertPlatformRuntimePolicyFor("staging", "aws"), "aws");
assert.equal(assertPlatformRuntimePolicyFor("production", "aws"), "aws");
assert.throws(
  () => assertPlatformRuntimePolicyFor("staging", "supabase"),
  /DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME/,
);
assert.throws(
  () => assertPlatformRuntimePolicyFor("production", "supabase"),
  /DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME/,
);
assert.throws(
  () => assertPlatformRuntimePolicyFor("production", "invalid"),
  /PLATFORM_RUNTIME_PROVIDER_INVALID/,
);

assert.match(lambdaDockerfile, /PLATFORM_RUNTIME_PROVIDER=aws/, "Lambda image must select AWS");
assert.match(lambdaDockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/live/, "Web Adapter must wait only for the HTTP process");
assert.doesNotMatch(lambdaDockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/ready/, "Dependency readiness must not block Lambda initialization");
assert.doesNotMatch(lambdaDockerfile, /AWS_LWA_ERROR_STATUS_CODES/, "HTTP errors must preserve their response semantics");
assert.doesNotMatch(lambdaDockerfile, /NEXT_PUBLIC_SUPABASE/, "AWS image must not contain Supabase build configuration");

assert.match(environmentExample, /PLATFORM_RUNTIME_PROVIDER=supabase/, "Development example must select Supabase");
assert.match(environmentExample, /# Production requires PLATFORM_RUNTIME_PROVIDER=aws/, "Environment example must document AWS production");
assert.match(environmentExample, /# Staging also requires PLATFORM_RUNTIME_PROVIDER=aws/, "Environment example must document AWS staging");
assert.match(buildConfiguration, /provider === "supabase"/, "Build validation must be provider-aware");
assert.doesNotMatch(buildConfiguration, /fetch\(/, "Build validation must remain offline and reproducible");
assert.match(publicOrigin, /DEPLOYED_PUBLIC_APPLICATION_ORIGIN_REQUIRED/, "Deployed origin must fail closed");
assert.doesNotMatch(publicOrigin, /CANONICAL_VERCEL_ORIGIN/, "AWS production must not fall back to Vercel");

assert.match(supabaseConfig, /lms-estimulo-web\.vercel\.app/, "Supabase must retain the controlled test preview callback");
assert.doesNotMatch(supabaseConfig, /plataforma\.estimulo\.org/, "Supabase must not claim the AWS production domain");

assert.match(decision, /Supabase permanece autorizado somente para desenvolvimento/, "AWS decision must keep Supabase outside production");
assert.match(decision, /RDS Proxy/, "AWS decision must include RDS Proxy");
assert.match(decision, /Amazon S3/, "AWS decision must include S3");
assert.match(decision, /Amazon SQS/, "AWS decision must include SQS workers");
assert.match(targetArchitecture, /Arquitetura canônica/, "Target architecture must be singular");
assert.doesNotMatch(targetArchitecture, /opções de compute/i, "Target architecture must not present competing compute options");

assert.match(runtimeProvider, /return assertPlatformRuntimePolicyFor\(/, "Every provider lookup must enforce the environment policy");
assert.match(readiness, /aws_runtime_adapters_unavailable/, "AWS dependency readiness must remain closed until adapters exist");
assert.match(rpcGateway, /AWS_RPC_GATEWAY_NOT_IMPLEMENTED/, "AWS PostgreSQL gateway must fail closed until implemented");
assert.match(authContext, /AWS_IDENTITY_ADAPTER_NOT_IMPLEMENTED/, "AWS identity must fail closed until implemented");
assert.match(proxy, /aws_identity_adapter_unavailable/, "AWS proxy must reject protected traffic until identity exists");
assert.match(proxy, /assertPlatformRuntimePolicy/, "Proxy must enforce the central provider policy");
assert.match(supabaseServer, /SUPABASE_SESSION_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME/, "Supabase session adapter must be test-only");
assert.match(supabaseAdmin, /SUPABASE_PRIVILEGED_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME/, "Supabase privileged adapter must be test-only");

assert.match(objectStorage, /AWS_BUCKETS_MUST_BE_PROVISIONED_BY_INFRASTRUCTURE/, "AWS buckets must not be created by requests");
assert.match(objectStorage, /AWS_DIRECT_UPLOAD_REQUIRED/, "AWS buffered uploads must be forbidden");
assert.match(objectStorage, /AWS_DIRECT_UPLOAD_ADAPTER_NOT_IMPLEMENTED/, "Direct S3 adapter must fail closed until implemented");
for (const [index, source] of featureStorageSources.entries()) {
  assert.doesNotMatch(source, /@\/lib\/supabase\/admin/, `${storageModules[index]} must use the platform storage boundary`);
  assert.match(source, /@\/lib\/platform\/object-storage/, `${storageModules[index]} must use the platform storage boundary`);
}

assert.equal(packageJson.scripts?.["verify:supabase"], "node scripts/verification/verify-supabase.mjs");
assert.match(supabaseVerification, /\/auth\/v1\/settings/, "Supabase verification must check Auth");
assert.match(supabaseVerification, /get_application_readiness/, "Supabase verification must check database readiness");
assert.match(supabaseVerification, /reachable_and_protected/, "Supabase verification must check the authenticated gateway boundary");

assert.match(databaseGates, /DATABASE_GATE_NON_TEST_SQL_FORBIDDEN/, "Database gates must reject non-test SQL after canonical replay");
assert.match(databaseGates, /runSqlTestSuite/, "Database gates must use assertion-only suites");
assert.doesNotMatch(databaseGates, /supabase\/migrations\//, "Database gates must not reapply migrations after canonical replay");
assert.doesNotMatch(databaseGates, /operational-persistence\.sql/, "Database gates must not apply duplicate implementation SQL");
assert.doesNotMatch(databaseGates, /content-library\/(schema|api|event-versioning|hardening)\.sql/, "Database gates must not apply duplicate library SQL");

assert.equal(await exists("Dockerfile"), false, "Only Dockerfile.lambda may remain");
assert.equal(await exists("infra/aws/terraform"), false, "Obsolete ECS Terraform must be removed");
assert.equal(await exists("supabase/functions/file-storage"), false, "Unused parallel file-storage function must remain removed");
assert.equal(await exists("supabase/functions/authenticated-rpc/index.ts"), true, "Authenticated RPC must remain as the Supabase test gateway");

process.stdout.write("[platform-contract] Supabase test and AWS Lambda production boundaries are consistent\n");
