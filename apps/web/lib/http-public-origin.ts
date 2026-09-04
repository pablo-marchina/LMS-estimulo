import "server-only";

import { headers } from "next/headers";
import { applicationEnvironment } from "@/lib/platform/runtime-provider";
import {
  resolveParticipantApplicationOrigin,
  resolvePublicApplicationOrigin,
} from "./http-public-origin-core.mjs";

function runtimeOriginInput(requestOrigin?: string) {
  return {
    environment: applicationEnvironment(),
    requestOrigin,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelEnv: process.env.VERCEL_ENV,
    vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
    vercelUrl: process.env.VERCEL_URL,
    nextPublicVercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    port: process.env.PORT,
  };
}

function firstForwardedValue(value: string | null): string | null {
  const first = value?.split(",", 1)[0]?.trim() ?? "";
  return first || null;
}

async function requestOriginFromHeaders(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const explicitOrigin = requestHeaders.get("origin")?.trim();
  if (explicitOrigin && explicitOrigin !== "null") return explicitOrigin;

  const host = firstForwardedValue(requestHeaders.get("x-forwarded-host"))
    ?? firstForwardedValue(requestHeaders.get("host"));
  if (!host) return undefined;

  const forwardedProtocol = firstForwardedValue(requestHeaders.get("x-forwarded-proto"));
  const localHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/iu.test(host);
  const protocol = forwardedProtocol ?? (localHost ? "http" : "https");
  return `${protocol}://${host}`;
}

export function publicApplicationOrigin(requestOrigin?: string): string {
  return resolvePublicApplicationOrigin(runtimeOriginInput(requestOrigin));
}

export async function participantApplicationOrigin(requestOrigin?: string): Promise<string> {
  const effectiveRequestOrigin = requestOrigin ?? await requestOriginFromHeaders();
  return resolveParticipantApplicationOrigin(runtimeOriginInput(effectiveRequestOrigin));
}
