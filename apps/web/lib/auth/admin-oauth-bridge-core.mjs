const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

export const DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN = "https://lms-estimulo-web.vercel.app";

function normalizedUrl(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
  } catch {
    return null;
  }
}

export function isLocalApplicationOrigin(value) {
  const url = normalizedUrl(value);
  return Boolean(url && localHostnames.has(url.hostname) && (url.protocol === "http:" || url.protocol === "https:"));
}

export function localAdminCallbackUrl(value) {
  const url = normalizedUrl(value);
  if (!url || !localHostnames.has(url.hostname) || url.protocol !== "http:") return null;
  if (url.pathname !== "/auth/admin/callback") return null;
  url.hash = "";
  return url;
}

export function adminOAuthRedirectTarget({ applicationOrigin, requestOrigin, bridgeOrigin }) {
  const callback = new URL("/auth/admin/callback", applicationOrigin);
  if (!isLocalApplicationOrigin(requestOrigin)) return callback.toString();

  const configuredBridge = normalizedUrl(bridgeOrigin) ?? normalizedUrl(DEFAULT_LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN);
  if (!configuredBridge || configuredBridge.protocol !== "https:" || localHostnames.has(configuredBridge.hostname)) {
    throw new Error("LOCAL_ADMIN_OAUTH_BRIDGE_ORIGIN_INVALID");
  }

  const bridge = new URL("/auth/admin/local-bridge", configuredBridge.origin);
  bridge.searchParams.set("return_to", callback.toString());
  return bridge.toString();
}
