import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;

function resolveRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? "";
  return requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
}

function releaseIdentifier(): string {
  const value = process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.GIT_COMMIT_SHA
    ?? process.env.SOURCE_VERSION
    ?? "unknown";
  return value === "unknown" ? value : value.slice(0, 12);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const requestId = resolveRequestId(request);
  const duration = Math.max(0, performance.now() - startedAt).toFixed(1);
  return NextResponse.json(
    {
      status: "ok",
      service: "lms-estimulo-web",
      release: releaseIdentifier(),
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
        "server-timing": `live;dur=${duration}`,
      },
    },
  );
}
