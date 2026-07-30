import type { IdentityContext } from "@/lib/journey-runtime/contracts";

const ADMINISTRATIVE_PERMISSIONS = new Set([
  "journey.execution.read",
  "journey.execution.manage",
  "participant.manage",
  "engagement.manage",
  "assessment.review",
  "diagnostic.configuration.manage",
  "iam.memberships.manage",
]);

const corporateGoogleDomain = "estimulo.org";

export function usesCorporateGoogleIdentity(email: string) {
  const normalized = email.trim().toLocaleLowerCase("pt-BR");
  const domain = normalized.split("@").at(-1) ?? "";
  return domain === corporateGoogleDomain;
}

export function administrativeOrganization(identity: IdentityContext) {
  return identity.organizations.find((organization) => organization.slug === "estimulo")
    ?? identity.organizations.find((organization) =>
      organization.permissions.some((permission) => ADMINISTRATIVE_PERMISSIONS.has(permission))
    );
}
