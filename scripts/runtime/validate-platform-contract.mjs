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
  architectureStatus,
  runtimeProvider,
  buildConfiguration,
  publicOrigin,
  readiness,
  authContext,
  proxy,
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
  read("docs/architecture/AWS_ARCHITECTURE_STATUS.md"),
  read("apps/web/lib/platform/runtime-provider.ts"),
  read("scripts/runtime/validate-production-config.mjs"),
  read("apps/web/lib/http-public-origin.ts"),
  read("apps/web/app/api/health/ready/route.ts"),
  read("apps/web/lib/auth/context.ts"),
  read("apps/web/proxy.ts"),
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
const forbiddenPrematureDecisions = [
  "api_gateway_http_api",
  "cloudfront",
  "cognito",
  "rds_proxy",
  "rds_postgresql",
  "s3_private",
  "sqs_lambda",
  "secrets_manager",
  "cloudwatch",
];

assert.equal(productionContract.schema_version, "2.0");
assert.equal(productionContract.environment_class, "production");
assert.equal(productionContract.runtime_provider, "aws");
assert.equal(productionContract.compute, "lambda_container");
assert.equal(productionContract.architecture_status, "decision_pending");
assert.equal(productionContract.supabase_allowed, false);
assert.equal(productionContract.vercel_allowed, false);
assert.equal(productionContract.implementation.architecture_decision_approved, false);
assert.equal(productionContract.implementation.production_ready, false);
for (const forbidden of forbiddenPrematureDecisions) {
  assert.doesNotMatch(productionContractSource.toLowerCase(), new RegExp(forbidden), `AWS contract must not pre-decide ${forbidden}`);
}

assert.equal(assertPlatformRuntimePolicyFor("development", "supabase"), "supabase");
assert.equal(assertPlatformRuntimePolicyFor("test", "supabase"), "supabase");
assert.equal(assertPlatformRuntimePolicyFor("preview", "supabase"), "supabase");
assert.equal(assertPlatformRuntimePolicyFor("staging", "aws"), "aws");
assert.equal(assertPlatformRuntimePolicyFor("production", "aws"), "aws");
assert.throws(() => assertPlatformRuntimePolicyFor("staging", "supabase"), /DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME/);
assert.throws(() => assertPlatformRuntimePolicyFor("production", "supabase"), /DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME/);
assert.throws(() => assertPlatformRuntimePolicyFor("production", "invalid"), /PLATFORM_RUNTIME_PROVIDER_INVALID/);

assert.match(lambdaDockerfile, /PLATFORM_RUNTIME_PROVIDER=aws/, "Lambda image must select AWS");
assert.match(lambdaDockerfile, /AWS_LWA_READINESS_CHECK_PATH=\/api\/health\/live/, "Lambda image must wait only for the HTTP process");
assert.doesNotMatch(lambdaDockerfile, /NEXT_PUBLIC_SUPABASE/, "AWS image must not contain Supabase build configuration");
assert.match(environmentExample, /PLATFORM_RUNTIME_PROVIDER=supabase/, "Development example must select Supabase");
assert.match(buildConfiguration, /provider === "supabase"/, "Build validation must remain provider-aware");
assert.doesNotMatch(buildConfiguration, /fetch\(/, "Build validation must remain offline and reproducible");
assert.match(publicOrigin, /DEPLOYED_PUBLIC_APPLICATION_ORIGIN_REQUIRED/, "Deployed origin must fail closed");
assert.doesNotMatch(publicOrigin, /CANONICAL_VERCEL_ORIGIN/, "AWS production must not fall back to Vercel");
assert.match(supabaseConfig, /lms-estimulo-web\.vercel\.app/, "Supabase must retain the controlled test preview callback");
assert.doesNotMatch(supabaseConfig, /plataforma\.estimulo\.org/, "Supabase must not claim the production domain");

assert.match(architectureStatus, /decisões de arquitetura.*pendentes/is, "AWS status must explicitly remain undecided");
assert.match(architectureStatus, /Dockerfile\.lambda/, "AWS status must retain the only approved implementation decision");
assert.match(runtimeProvider, /awsArchitectureStatus = "decision_pending"/, "Runtime must expose the pending AWS architecture state");
assert.match(readiness, /aws_architecture_pending/, "AWS readiness must fail closed while architecture is pending");
assert.match(authContext, /AWS_IDENTITY_ARCHITECTURE_PENDING/, "AWS identity must fail closed while undecided");
assert.match(proxy, /aws_identity_architecture_pending/, "Protected AWS traffic must fail closed while identity is undecided");
assert.match(supabaseServer, /SUPABASE_SESSION_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME/, "Supabase session adapter must be test-only");
assert.match(supabaseAdmin, /SUPABASE_PRIVILEGED_ADAPTER_FORBIDDEN_IN_AWS_RUNTIME/, "Supabase privileged adapter must be test-only");
for (const [index, source] of featureStorageSources.entries()) {
  assert.doesNotMatch(source, /@\/lib\/supabase\/admin/, `${storageModules[index]} must use the platform storage boundary`);
  assert.match(source, /@\/lib\/platform\/object-storage/, `${storageModules[index]} must use the platform storage boundary`);
}

assert.equal(packageJson.scripts?.["verify:supabase"], "node scripts/verification/verify-supabase.mjs");
assert.match(supabaseVerification, /\/auth\/v1\/settings/, "Supabase verification must check Auth");
assert.match(supabaseVerification, /get_application_readiness/, "Supabase verification must check database readiness");
assert.match(supabaseVerification, /reachable_and_protected/, "Supabase verification must check the authenticated test gateway");
assert.match(databaseGates, /DATABASE_GATE_NON_TEST_SQL_FORBIDDEN/, "Database gates must reject non-test SQL after canonical replay");
assert.match(databaseGates, /runSqlTestSuite/, "Database gates must use assertion-only suites");

assert.equal(await exists("Dockerfile"), false, "Only Dockerfile.lambda may remain");
assert.equal(await exists("infra/aws"), false, "Premature AWS infrastructure documentation and code must be removed");
assert.equal(await exists("supabase/functions/file-storage"), false, "Unused parallel file-storage function must remain removed");
assert.equal(await exists("supabase/functions/authenticated-rpc/index.ts"), true, "Supabase test gateway must remain versioned");

process.stdout.write("[platform-contract] Supabase/Vercel test boundary and undecided AWS Lambda production boundary are consistent\n");
