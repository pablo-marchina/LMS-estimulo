import { NextResponse } from "next/server";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const requiredEnvironment = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY"
] as const;

function classifyPrivilegedKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const wrapped =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (value.startsWith("sb_secret_")) {
    return { type: "secret", role: "service_role", wrapped };
  }
  if (value.startsWith("sb_publishable_")) {
    return { type: "publishable", role: "anon", wrapped };
  }
  if (value.startsWith("eyJ")) {
    try {
      const payloadPart = value.split(".")[1];
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
        role?: unknown;
        ref?: unknown;
      };
      return {
        type: "legacy_jwt",
        role: typeof payload.role === "string" ? payload.role : "unknown",
        projectRef: typeof payload.ref === "string" ? payload.ref : "unknown",
        wrapped
      };
    } catch {
      return { type: "malformed_jwt", role: "unknown", wrapped };
    }
  }
  return { type: "unknown", role: "unknown", wrapped };
}

function logReadinessFailure(error: unknown) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  console.error("APPLICATION_READINESS_DATABASE_UNAVAILABLE", {
    privilegedKey: classifyPrivilegedKey(),
    errorCode: record?.code ?? null,
    errorMessage: record?.message ?? (error instanceof Error ? error.message : null)
  });
}

export async function GET() {
  const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { status: "not_ready", reason: "configuration_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const client = createPrivilegedClient();
    const { data, error } = await client.rpc("get_application_readiness");
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || result.status !== "ready") {
      logReadinessFailure(error ?? new Error("Unexpected readiness payload"));
      return NextResponse.json(
        { status: "not_ready", reason: "database_unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }
    return NextResponse.json(
      { status: "ready" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    logReadinessFailure(error);
    return NextResponse.json(
      { status: "not_ready", reason: "database_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
