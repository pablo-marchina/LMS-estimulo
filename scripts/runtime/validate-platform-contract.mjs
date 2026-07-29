import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
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
  decision,
  targetArchitecture,
  runtimeProvider,
  readiness,
  rpcGateway,
  authContext,
  proxy,
  objectStorage,
  terraformReadme,
  productionContractSource,
  ...featureStorageSources
] = await Promise.all([
  read("Dockerfile.lambda"),
  read(".env.example"),
  read("docs/decisions/AWS_PRODUCTION_ARCHITECTURE.md"),
  read("docs/architecture/AWS_TARGET_ARCHITECTURE.md"),
  read("apps/web/lib/platform/runtime-provider.ts"),
  read("apps/web/app/api/health/ready/route.ts"),
  read("apps/web/lib/rpc/authenticated-gateway.ts"),
  read("apps/web/lib/auth/context.ts"),
  read("apps/web/proxy.ts"),
  read("apps/web/lib/platform/object-storage.ts"),
  read("infra/aws/terraform/README.md"),
  read("config/platform/aws-production.json"),
  ...storageModules.map(read),
]);

const productionContract = JSON.parse(productionContractSource);
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
assert.match(readiness, /aws_runtime_adapters_unavailable/, "AWS readiness must remain closed until adapters exist");
assert.match(rpcGateway, /AWS_RPC_GATEWAY_NOT_IMPLEMENTED/, "AWS PostgreSQL gateway must fail closed until implemented");
assert.match(authContext, /AWS_IDENTITY_ADAPTER_NOT_IMPLEMENTED/, "AWS auth context must fail closed until implemented");
assert.match(proxy, /aws_identity_adapter_unavailable/, "AWS proxy must reject traffic until Cognito integration exists");
assert.match(proxy, /assertPlatformRuntimePolicy/, "Proxy must enforce the central provider policy");

assert.match(objectStorage, /AWS_BUCKETS_MUST_BE_PROVISIONED_BY_INFRASTRUCTURE/, "AWS buckets must never be created by application requests");
assert.match(objectStorage, /AWS_DIRECT_UPLOAD_REQUIRED/, "AWS buffered uploads must be forbidden");
assert.match(objectStorage, /AWS_DIRECT_UPLOAD_ADAPTER_NOT_IMPLEMENTED/, "Direct S3 adapter must fail closed until implemented");
for (const [index, source] of featureStorageSources.entries()) {
  assert.doesNotMatch(source, /@\/lib\/supabase\/admin/, `${storageModules[index]} must use the platform storage boundary`);
  assert.match(source, /@\/lib\/platform\/object-storage/, `${storageModules[index]} must use the platform storage boundary`);
}

assert.match(terraformReadme, /não aplicar/i, "Superseded ECS Terraform must remain explicitly blocked");
assert.match(terraformReadme, /terraform_apply_allowed = false/, "Superseded ECS Terraform must fail the operational approval rule");

process.stdout.write("[platform-contract] AWS production architecture is internally consistent\n");
