import assert from "node:assert/strict";
import { test } from "node:test";
import {
  administrativeOrganization,
  hasAdministrativePermission,
  hasAnyAdministrativePermission,
} from "../../apps/web/lib/auth/administrative-access.ts";

function identity(organizations) {
  return { organizations };
}

function organization({ id, slug, permissions = [] }) {
  return {
    organization_id: id,
    slug,
    name: slug,
    membership_id: `membership-${id}`,
    permissions,
  };
}

test("admin area requires an Estimulo membership even when another organization has admin capabilities", () => {
  const currentIdentity = identity([
    organization({ id: "partner", slug: "partner", permissions: ["iam.memberships.manage"] }),
  ]);

  assert.equal(administrativeOrganization(currentIdentity), null);
  assert.equal(hasAnyAdministrativePermission(currentIdentity), false);
  assert.equal(hasAdministrativePermission(currentIdentity, "iam.memberships.manage"), false);
});

test("an Estimulo member can be recognized before any administrative permission is granted", () => {
  const estimulo = organization({ id: "estimulo-id", slug: " Estimulo ", permissions: [] });
  const currentIdentity = identity([estimulo]);

  assert.equal(administrativeOrganization(currentIdentity), estimulo);
  assert.equal(hasAnyAdministrativePermission(currentIdentity), false);
  assert.equal(hasAdministrativePermission(currentIdentity, "iam.memberships.manage"), false);
});

test("administrative permissions are scoped to the Estimulo organization", () => {
  const estimulo = organization({
    id: "estimulo-id",
    slug: "estimulo",
    permissions: ["iam.memberships.manage", "content.write"],
  });
  const currentIdentity = identity([
    estimulo,
    organization({ id: "partner", slug: "partner", permissions: ["other.permission"] }),
  ]);

  assert.equal(hasAnyAdministrativePermission(currentIdentity), true);
  assert.equal(hasAdministrativePermission(currentIdentity, "iam.memberships.manage"), true);
  assert.equal(hasAdministrativePermission(currentIdentity, "iam.memberships.manage", "estimulo-id"), true);
  assert.equal(hasAdministrativePermission(currentIdentity, "iam.memberships.manage", "partner"), false);
  assert.equal(hasAdministrativePermission(currentIdentity, "other.permission"), false);
});
