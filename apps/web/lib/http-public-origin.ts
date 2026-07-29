import "server-only";
import { applicationEnvironment } from "@/lib/platform/runtime-provider";
import { resolvePublicApplicationOrigin } from "./http-public-origin-core.mjs";

export function publicApplicationOrigin(requestOrigin?: string): string {
  return resolvePublicApplicationOrigin({
    environment: applicationEnvironment(),
    requestOrigin,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelEnv: process.env.VERCEL_ENV,
    vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
    vercelUrl: process.env.VERCEL_URL,
    nextPublicVercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    port: process.env.PORT,
  });
}
