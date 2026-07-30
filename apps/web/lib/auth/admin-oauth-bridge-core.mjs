const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

export const DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN = "https://lms-estimulo-web.vercel.app";
export const ADMIN_LOCAL_OAUTH_RETURN_COOKIE = "estimulo-admin-local-oauth-return";

function normalizedUrl(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
  } catch {
    return null;
  }
}

function configuredBridgeOrigin(value) {
  const bridge = normalizedUrl(value) ?? normalizedUrl(DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN);
  if (!bridge || bridge.protocol !== "https:" || localHostnames.has(bridge.hostname)) {
    throw new Error("LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN_INVALID");
  }
  return bridge.origin;
}

export function isLocalApplicationOrigin(value) {
  const url = normalizedUrl(value);
  return Boolean(url && localHostnames.has(url.hostname) && (url.protocol === "http:" || url.protocol === "https:"));
}

export function localAdminCallbackUrl(value) {
  const url = normalizedUrl(value);
  if (!url || !localHostnames.has(url.hostname) || url.protocol !== "http:") return null;
  if (url.pathname !== "/auth/admin/callback" || url.username || url.password) return null;
  url.search = "";
  url.hash = "";
  return url;
}

export function encodeLocalAdminCallback(value) {
  const callback = localAdminCallbackUrl(value);
  return callback ? encodeURIComponent(callback.toString()) : null;
}

export function decodeLocalAdminCallback(value) {
  try {
    return localAdminCallbackUrl(decodeURIComponent(String(value ?? "")));
  } catch {
    return null;
  }
}

export function adminOAuthPreparationTarget({ applicationOrigin, requestOrigin, bridgeOrigin }) {
  if (!isLocalApplicationOrigin(requestOrigin)) return null;
  const callback = localAdminCallbackUrl(new URL("/auth/admin/callback", applicationOrigin).toString());
  if (!callback) throw new Error("LOCAL_ADMIN_OAUTH_CALLBACK_INVALID");

  const prepare = new URL("/auth/admin/local-bridge/prepare", configuredBridgeOrigin(bridgeOrigin));
  prepare.searchParams.set("return_to", callback.toString());
  return prepare.toString();
}

export function localAdminOAuthResumeUrl(callbackValue) {
  const callback = localAdminCallbackUrl(callbackValue);
  if (!callback) return null;
  const resume = new URL("/auth/admin/start", callback.origin);
  resume.searchParams.set("bridge_ready", "1");
  return resume;
}

export function adminOAuthRedirectTarget({ applicationOrigin, requestOrigin, bridgeOrigin }) {
  const callback = new URL("/auth/admin/callback", applicationOrigin);
  if (!isLocalApplicationOrigin(requestOrigin)) return callback.toString();

  // Use the exact hosted Site URL. Supabase may discard unallowlisted paths or query
  // strings, but the bridge cookie prepared beforehand survives that fallback.
  return `${configuredBridgeOrigin(bridgeOrigin)}/`;
}
