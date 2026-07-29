const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(value) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    const local = localHostnames.has(url.hostname);
    if (local && url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!local && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(value) {
  try {
    return localHostnames.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function firstOrigin(...values) {
  for (const value of values) {
    const origin = normalizeOrigin(value);
    if (origin) return origin;
  }
  return null;
}

export function resolvePublicApplicationOrigin(input = {}) {
  const environment = String(input.environment ?? "development").trim().toLowerCase() || "development";
  const requestOrigin = normalizeOrigin(input.requestOrigin);

  // A request that actually reached a local development server must return to that
  // same local origin, even when stale Vercel variables exist in the shell.
  if ((environment === "development" || environment === "test") && requestOrigin && isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const configured = firstOrigin(input.appUrl, input.siteUrl);

  if (environment === "staging" || environment === "production") {
    if (!configured || isLocalOrigin(configured)) {
      throw new Error("DEPLOYED_PUBLIC_APPLICATION_ORIGIN_REQUIRED");
    }
    return configured;
  }

  if (input.vercelEnv === "preview") {
    const previewOrigin = firstOrigin(input.vercelBranchUrl, input.vercelUrl, input.nextPublicVercelUrl, configured);
    if (!previewOrigin) throw new Error("PREVIEW_PUBLIC_APPLICATION_ORIGIN_REQUIRED");
    return previewOrigin;
  }

  if (configured) return configured;
  const port = String(input.port ?? "3000").trim() || "3000";
  return `http://localhost:${port}`;
}
