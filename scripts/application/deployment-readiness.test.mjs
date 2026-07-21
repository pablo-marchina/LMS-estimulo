import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [dockerfile, nextConfig, live, ready, migration, versions, variables, terraformMain, tfvars, terraformReadme] = await Promise.all([
  readFile("Dockerfile", "utf8"),
  readFile("apps/web/next.config.ts", "utf8"),
  readFile("apps/web/app/api/health/live/route.ts", "utf8"),
  readFile("apps/web/app/api/health/ready/route.ts", "utf8"),
  readFile("supabase/migrations/20260720185000_application_readiness.sql", "utf8"),
  readFile("infra/aws/terraform/versions.tf", "utf8"),
  readFile("infra/aws/terraform/variables.tf", "utf8"),
  Promise.all(["main.tf", "network.tf", "compute.tf", "storage.tf", "database.tf", "observability.tf"].map((file) => readFile(`infra/aws/terraform/${file}`, "utf8"))).then((parts) => parts.join("\n")),
  readFile("infra/aws/terraform/terraform.tfvars.example", "utf8"),
  readFile("infra/aws/terraform/README.md", "utf8"),
]);

test("container build is pinned, standalone, non-root and rejects missing public config", () => {
  assert.match(dockerfile, /FROM node:22\.16\.0-bookworm-slim/u);
  assert.match(dockerfile, /npm ci --ignore-scripts/u);
  assert.match(dockerfile, /ARG NEXT_PUBLIC_APP_URL\n/u);
  assert.match(dockerfile, /ARG NEXT_PUBLIC_SUPABASE_URL\n/u);
  assert.match(dockerfile, /ARG NEXT_PUBLIC_SUPABASE_ANON_KEY\n/u);
  assert.match(dockerfile, /missing build argument/u);
  assert.match(dockerfile, /must use https/u);
  assert.match(dockerfile, /npm run build:web/u);
  assert.match(dockerfile, /USER nextjs/u);
  assert.match(dockerfile, /--uid 1001/u);
  assert.match(dockerfile, /api\/health\/live/u);
  assert.doesNotMatch(dockerfile, /SUPABASE_SERVICE_ROLE_KEY|HUBSPOT_PRIVATE_APP_TOKEN|MALWARE_SCANNER_API_KEY/u);
  assert.doesNotMatch(dockerfile, /https:\/\/build\.invalid|build-placeholder/u);
  assert.match(nextConfig, /output: "standalone"/u);
});

test("liveness is local while readiness checks configuration and database", () => {
  assert.match(live, /status: "ok"/u);
  assert.doesNotMatch(live, /createPrivilegedClient|rpc\(/u);
  assert.match(ready, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.match(ready, /get_application_readiness/u);
  assert.match(ready, /status: 503/u);
  assert.match(ready, /cache-control/u);
  assert.doesNotMatch(ready, /error\.message|JSON\.stringify\(process\.env|SUPABASE_SERVICE_ROLE_KEY.*NextResponse/u);
  assert.match(migration, /integration\.external_object_mappings/u);
  assert.match(migration, /revoke all on function public\.get_application_readiness\(\) from public,anon,authenticated/u);
});

test("Terraform versions and deployment guard are explicit", () => {
  assert.match(versions, /required_version = ">= 1\.14\.0, < 2\.0\.0"/u);
  assert.match(versions, /version = "~> 6\.55\.0"/u);
  assert.match(variables, /variable "confirm_deployment"[\s\S]*default\s+= false/u);
  assert.match(terraformMain, /resource "terraform_data" "deployment_guard"/u);
  assert.match(terraformMain, /condition\s+= var\.confirm_deployment/u);
  assert.match(terraformMain, /expected_aws_account_id/u);
  assert.match(variables, /@sha256:\[a-f0-9\]\{64\}/u);
  assert.match(tfvars, /confirm_deployment\s+= false/u);
  assert.doesNotMatch(terraformMain, /[0-9]{12}\.dkr\.ecr|arn:aws:acm:[^\n]*:[0-9]{12}/u);
});

test("public browser configuration is separate from server-side secrets", () => {
  assert.match(variables, /variable "public_environment"/u);
  assert.match(variables, /variable "secret_arns"/u);
  assert.match(variables, /must not contain NEXT_PUBLIC_/u);
  assert.match(terraformMain, /NEXT_PUBLIC_APP_URL/u);
  assert.match(terraformMain, /NEXT_PUBLIC_SUPABASE_URL/u);
  assert.match(terraformMain, /NEXT_PUBLIC_SUPABASE_ANON_KEY/u);
  assert.match(terraformMain, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.doesNotMatch(tfvars, /NEXT_PUBLIC_[A-Z_]+\s*=\s*"arn:aws:secretsmanager:/u);
  assert.match(terraformReadme, /freezes every `NEXT_PUBLIC_\*` value/u);
  assert.match(terraformReadme, /same values are repeated in `public_environment`/u);
});

test("Terraform baseline keeps compute and data private and encrypted", () => {
  for (const pattern of [
    /assign_public_ip = false/u,
    /publicly_accessible\s+= false/u,
    /storage_encrypted\s+= true/u,
    /manage_master_user_password\s+= true/u,
    /deletion_protection\s+= true/u,
    /readonlyRootFilesystem = true/u,
    /user\s+= "1001:1001"/u,
    /image_tag_mutability = "IMMUTABLE"/u,
    /scan_on_push = true/u,
    /block_public_acls\s+= true/u,
    /restrict_public_buckets\s+= true/u,
    /sse_algorithm\s+= "aws:kms"/u,
    /blocked_encryption_types = \["SSE-C"\]/u,
    /deadLetterTargetArn/u,
    /ApproximateAgeOfOldestMessage/u,
    /HTTPCode_Target_5XX_Count/u,
  ]) assert.match(terraformMain, pattern);
});

test("Terraform accepts only secret ARNs and documents remaining portability blockers", () => {
  assert.match(variables, /Secret values never enter Terraform state/u);
  assert.match(terraformMain, /Resource = values\(var\.secret_arns\)/u);
  assert.doesNotMatch(terraformMain, /access_key\s*=|secret_key\s*=|password\s*=\s*"/u);
  assert.match(terraformReadme, /still uses Supabase Auth, Storage and RPC APIs/u);
  assert.match(terraformReadme, /deployment scaffolding only/u);
  assert.match(terraformReadme, /does not run it automatically/u);
});
