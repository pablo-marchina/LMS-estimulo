import "server-only";

const CANONICAL_VERCEL_ORIGIN = "https://lms-estimulo-web.vercel.app";

function normalizeOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (local && url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!local && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstOrigin(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const origin = normalizeOrigin(value);
    if (origin) return origin;
  }
  return null;
}

export function publicApplicationOrigin(): string {
  const configured = firstOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  if (process.env.VERCEL_ENV === "preview") {
    return firstOrigin(
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
      configured ?? undefined,
    ) ?? CANONICAL_VERCEL_ORIGIN;
  }

  if (process.env.VERCEL_ENV === "production") {
    return firstOrigin(
      configured ?? undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
    ) ?? CANONICAL_VERCEL_ORIGIN;
  }

  if (configured) return configured;
  return `http://localhost:${process.env.PORT?.trim() || "3000"}`;
}
