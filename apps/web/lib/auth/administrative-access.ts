import type { IdentityContext, OrganizationAccess } from "@/lib/journey-runtime/contracts";

export const ESTIMULO_ORGANIZATION_SLUG = "estimulo";
export const ROLE_MANAGEMENT_PERMISSION = "iam.memberships.manage";

const corporateGoogleDomain = "estimulo.org";

function normalizeOrganizationSlug(slug: string | undefined) {
  return slug?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

export function usesCorporateGoogleIdentity(email: string) {
  const normalized = email.trim().toLocaleLowerCase("pt-BR");
  const domain = normalized.split("@").at(-1) ?? "";
  return domain === corporateGoogleDomain;
}

/**
 * The administrative-area gate is organizational membership, not an admin role.
 *
 * IdentityContext only exposes organizations for memberships that are valid for
 * the current identity. Keeping this lookup strict prevents a capability from a
 * different organization from becoming an implicit ticket into /admin.
 */
export function administrativeOrganization(identity: IdentityContext): OrganizationAccess | null {
  return identity.organizations.find(
    (organization) => normalizeOrganizationSlug(organization.slug) === ESTIMULO_ORGANIZATION_SLUG,
  ) ?? null;
}

export function hasAdministrativePermission(
  identity: IdentityContext,
  permission: string,
  organizationId?: string,
) {
  const organization = administrativeOrganization(identity);
  if (!organization) return false;
  if (organizationId && organization.organization_id !== organizationId) return false;
  return organization.permissions.includes(permission);
}

export function hasAnyAdministrativePermission(identity: IdentityContext) {
  return (administrativeOrganization(identity)?.permissions.length ?? 0) > 0;
}
