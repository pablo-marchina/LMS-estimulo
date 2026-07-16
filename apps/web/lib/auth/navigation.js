const INTERNAL_BASE_URL = "https://plataforma.estimulo.invalid";
const MAX_RETURN_TO_LENGTH = 2048;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const PARTICIPANT_ROUTE_PREFIXES = ["/empreendedor", "/capacitacao"];
const OPERATOR_ROUTE_PREFIXES = ["/admin"];
const AUTH_ROUTE_PREFIXES = ["/entrar", "/cadastro"];
const OPERATOR_PERMISSIONS = new Set(["journey.execution.read", "journey.execution.manage"]);

function matchesRoutePrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesAnyPrefix(pathname, prefixes) {
  return prefixes.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

function operatorOrganizations(identity) {
  return identity.organizations.filter((organization) =>
    organization.permissions.some((permission) => OPERATOR_PERMISSIONS.has(permission))
  );
}

export function isProtectedPath(pathname) {
  return matchesAnyPrefix(pathname, [...PARTICIPANT_ROUTE_PREFIXES, ...OPERATOR_ROUTE_PREFIXES]);
}

export function sanitizeReturnTo(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_RETURN_TO_LENGTH) return null;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("\\") || CONTROL_CHARACTERS.test(candidate)) return null;

  try {
    const parsed = new URL(candidate, INTERNAL_BASE_URL);
    if (parsed.origin !== INTERNAL_BASE_URL) return null;
    if (matchesAnyPrefix(parsed.pathname, AUTH_ROUTE_PREFIXES)) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function defaultAuthenticatedDestination(identity) {
  if (identity.entrepreneur_id) return "/empreendedor";
  const organization = operatorOrganizations(identity)[0];
  if (!organization) return null;
  return `/admin?organization=${encodeURIComponent(organization.organization_id)}`;
}

export function isAuthorizedDestination(identity, value) {
  const destination = sanitizeReturnTo(value);
  if (!destination) return false;
  const parsed = new URL(destination, INTERNAL_BASE_URL);

  if (matchesAnyPrefix(parsed.pathname, PARTICIPANT_ROUTE_PREFIXES)) {
    return Boolean(identity.entrepreneur_id);
  }

  if (matchesAnyPrefix(parsed.pathname, OPERATOR_ROUTE_PREFIXES)) {
    const organizations = operatorOrganizations(identity);
    if (organizations.length === 0) return false;
    const requestedOrganization = parsed.searchParams.get("organization");
    return !requestedOrganization || organizations.some((organization) => organization.organization_id === requestedOrganization);
  }

  return false;
}

export function resolveAuthenticatedDestination(identity, requestedReturnTo) {
  const destination = sanitizeReturnTo(requestedReturnTo);
  if (destination && isAuthorizedDestination(identity, destination)) return destination;
  return defaultAuthenticatedDestination(identity);
}
