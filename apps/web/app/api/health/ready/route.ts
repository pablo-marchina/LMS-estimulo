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
      return NextResponse.json(
        { status: "not_ready", reason: "database_unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } }
      );
    }
    return NextResponse.json(
      { status: "ready" },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { status: "not_ready", reason: "database_unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
