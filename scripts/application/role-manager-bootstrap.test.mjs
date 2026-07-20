import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseBootstrapArguments } from "../operations/bootstrap-role-manager.mjs";

const source = await readFile("scripts/operations/bootstrap-role-manager.mjs", "utf8");
const organizationId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";

test("bootstrap requires explicit organization, membership, reason and idempotency key", () => {
  assert.deepEqual(parseBootstrapArguments([
    "--organization", organizationId,
    "--membership", membershipId,
    "--reason", "Primeiro gestor aprovado",
    "--idempotency-key", "bootstrap-organization-0001",
  ]), {
    organizationId,
    membershipId,
    reason: "Primeiro gestor aprovado",
    idempotencyKey: "bootstrap-organization-0001",
  });

  assert.throws(() => parseBootstrapArguments([]), /ORGANIZATION_ID_REQUIRED/u);
  assert.throws(() => parseBootstrapArguments([
    "--organization", organizationId,
    "--membership", membershipId,
    "--reason", "x",
    "--idempotency-key", "bootstrap-organization-0001",
  ]), /BOOTSTRAP_REASON_REQUIRED/u);
});

test("bootstrap is service-role only and never infers a manager from email domain", () => {
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.match(source, /bootstrap_organization_role_manager/u);
  assert.match(source, /--organization/u);
  assert.match(source, /--membership/u);
  assert.doesNotMatch(source, /@estimulo\.org/u);
  assert.doesNotMatch(source, /console\.log\([^)]*serviceRoleKey/u);
});
