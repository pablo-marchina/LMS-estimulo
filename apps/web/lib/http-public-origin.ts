import "server-only";
import { applicationEnvironment } from "@/lib/platform/runtime-provider";

function normalizeOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  const withScheme = candidate.includes("://") ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (local && url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!local && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(value: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(value).hostname);
  } catch {
    return false;
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
  const environment = applicationEnvironment();
  const configured = firstOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  if (environment === "staging" || environment === "production") {
    if (!configured || isLocalOrigin(configured)) {
      throw new Error("DEPLOYED_PUBLIC_APPLICATION_ORIGIN_REQUIRED");
    }
    return configured;
  }

  if (process.env.VERCEL_ENV === "preview") {
    const previewOrigin = firstOrigin(
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_URL,
      process.env.NEXT_PUBLIC_VERCEL_URL,
      configured ?? undefined,
    );
    if (!previewOrigin) throw new Error("PREVIEW_PUBLIC_APPLICATION_ORIGIN_REQUIRED");
    return previewOrigin;
  }

  if (configured) return configured;
  return `http://localhost:${process.env.PORT?.trim() || "3000"}`;
}
