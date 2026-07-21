const ESTIMULO_ADMIN_DOMAIN = "estimulo.org";

export function normalizeIdentityEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEstimuloAdministrativeEmail(value: string): boolean {
  const email = normalizeIdentityEmail(value);
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) return false;
  return email.slice(separator + 1) === ESTIMULO_ADMIN_DOMAIN;
}

export function assertEstimuloAdministrativeEmail(value: string): void {
  if (!isEstimuloAdministrativeEmail(value)) {
    throw new Error("ESTIMULO_ADMIN_EMAIL_REQUIRED");
  }
}
