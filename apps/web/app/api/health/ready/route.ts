import { NextResponse } from "next/server";
import { assertCpfProtectionReady } from "@/lib/identity/cpf";
import {
  assertPlatformRuntimePolicy,
  missingAwsRuntimeEnvironment,
} from "@/lib/platform/runtime-provider";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const requiredSupabaseEnvironment = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
] as const;

function response(reason: string, status = 503) {
  return NextResponse.json(
    { status: status === 200 ? "ready" : "not_ready", reason: status === 200 ? undefined : reason },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function classifyPrivilegedKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const wrapped =
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"));

  if (value.startsWith("sb_secret_")) return { type: "secret", role: "service_role", wrapped };
  if (value.startsWith("sb_publishable_")) return { type: "publishable", role: "anon", wrapped };
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
        wrapped,
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
    errorMessage: record?.message ?? (error instanceof Error ? error.message : null),
  });
}

function assertCpfReadiness() {
  try {
    assertCpfProtectionReady();
    return null;
  } catch (error) {
    console.error("APPLICATION_READINESS_CPF_PROTECTION_UNAVAILABLE", {
      errorMessage: error instanceof Error ? error.message : null,
    });
    return response("security_configuration_unavailable");
  }
}

async function supabaseReadiness() {
  const missing = requiredSupabaseEnvironment.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.error("APPLICATION_READINESS_CONFIGURATION_UNAVAILABLE", { provider: "supabase", missing });
    return response("configuration_unavailable");
  }

  const cpfFailure = assertCpfReadiness();
  if (cpfFailure) return cpfFailure;

  try {
    const client = createPrivilegedClient();
    const { data, error } = await client.rpc("get_application_readiness");
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || result.status !== "ready") {
      logReadinessFailure(error ?? new Error("Unexpected readiness payload"));
      return response("database_unavailable");
    }
    return response("ready", 200);
  } catch (error) {
    logReadinessFailure(error);
    return response("database_unavailable");
  }
}

function awsReadiness() {
  const missing = missingAwsRuntimeEnvironment();
  if (missing.length > 0) {
    console.error("APPLICATION_READINESS_CONFIGURATION_UNAVAILABLE", { provider: "aws", missing });
    return response("configuration_unavailable");
  }

  const cpfFailure = assertCpfReadiness();
  if (cpfFailure) return cpfFailure;

  // Do not return a false positive before Cognito, RDS Proxy and S3 probes are implemented.
  console.error("APPLICATION_READINESS_AWS_ADAPTERS_UNAVAILABLE");
  return response("aws_runtime_adapters_unavailable");
}

export async function GET() {
  try {
    const provider = assertPlatformRuntimePolicy();
    return provider === "aws" ? awsReadiness() : supabaseReadiness();
  } catch (error) {
    console.error("APPLICATION_READINESS_RUNTIME_POLICY_REJECTED", {
      errorMessage: error instanceof Error ? error.message : null,
    });
    return response("runtime_policy_rejected");
  }
}
