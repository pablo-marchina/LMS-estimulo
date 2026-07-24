import "server-only";

const CANONICAL_VERCEL_ORIGIN = "https://lms-estimulo-web.vercel.app";

function normalizeOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) return null;
    if (!local && !url.hostname.endsWith(".vercel.app") && process.env.NODE_ENV === "production") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function publicApplicationOrigin(): string {
  const configured = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  const production = normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production) return production;
  const branch = normalizeOrigin(process.env.VERCEL_BRANCH_URL);
  if (branch) return branch;
  const deployment = normalizeOrigin(process.env.VERCEL_URL);
  if (deployment) return deployment;
  if (process.env.NODE_ENV === "production") return CANONICAL_VERCEL_ORIGIN;
  return "http://localhost:3000";
}
