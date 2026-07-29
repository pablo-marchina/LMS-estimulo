import { NextResponse } from "next/server";
import { assertCpfProtectionReady } from "@/lib/identity/cpf";
import {
  assertPlatformRuntimePolicy,
  awsArchitectureStatus,
  missingAwsRuntimeEnvironment,
} from "@/lib/platform/runtime-provider";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const requiredSupabaseEnvironment = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
] as const;

function resolveRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? "";
  return requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
}

function readinessTimeoutMs(): number {
  const value = Number(process.env.READINESS_DATABASE_TIMEOUT_MS ?? 5_000);
  return Number.isInteger(value) && value >= 500 && value <= 30_000 ? value : 5_000;
}

function response(reason: string, requestId: string, startedAt: number, status = 503) {
  return NextResponse.json(
    { status: status === 200 ? "ready" : "not_ready", reason: status === 200 ? undefined : reason },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
        "server-timing": `ready;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`,
      },
    },
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

function logReadiness(level: "info" | "error", event: string, fields: Record<string, unknown>) {
  const payload = JSON.stringify({ level, event, component: "application_readiness", ...fields });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

function logReadinessFailure(error: unknown, requestId: string) {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  logReadiness("error", "database_unavailable", {
    request_id: requestId,
    privileged_key: classifyPrivilegedKey(),
    error_code: record?.code ?? null,
    error_name: error instanceof Error ? error.name : null,
  });
}

function assertCpfReadiness(requestId: string, startedAt: number) {
  try {
    assertCpfProtectionReady();
    return null;
  } catch (error) {
    logReadiness("error", "cpf_protection_unavailable", {
      request_id: requestId,
      error_name: error instanceof Error ? error.name : null,
    });
    return response("security_configuration_unavailable", requestId, startedAt);
  }
}

async function supabaseReadiness(requestId: string, startedAt: number) {
  const missing = requiredSupabaseEnvironment.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    logReadiness("error", "configuration_unavailable", {
      request_id: requestId,
      provider: "supabase",
      missing,
    });
    return response("configuration_unavailable", requestId, startedAt);
  }

  const cpfFailure = assertCpfReadiness(requestId, startedAt);
  if (cpfFailure) return cpfFailure;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), readinessTimeoutMs());
  try {
    const client = createPrivilegedClient();
    const { data, error } = await client
      .rpc("get_application_readiness")
      .abortSignal(controller.signal);
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result || result.status !== "ready") {
      logReadinessFailure(error ?? new Error("Unexpected readiness payload"), requestId);
      return response("database_unavailable", requestId, startedAt);
    }
    logReadiness("info", "ready", {
      request_id: requestId,
      provider: "supabase",
      duration_ms: Number(Math.max(0, performance.now() - startedAt).toFixed(1)),
    });
    return response("ready", requestId, startedAt, 200);
  } catch (error) {
    logReadinessFailure(error, requestId);
    return response(
      error instanceof Error && error.name === "AbortError" ? "database_timeout" : "database_unavailable",
      requestId,
      startedAt,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function awsReadiness(requestId: string, startedAt: number) {
  const missing = missingAwsRuntimeEnvironment();
  if (missing.length > 0) {
    logReadiness("error", "configuration_unavailable", {
      request_id: requestId,
      provider: "aws",
      missing,
    });
    return response("configuration_unavailable", requestId, startedAt);
  }

  const cpfFailure = assertCpfReadiness(requestId, startedAt);
  if (cpfFailure) return cpfFailure;

  // Production must never report ready until identity, data, storage, network,
  // asynchronous processing, observability and operations are selected and
  // implemented through an approved AWS architecture decision.
  logReadiness("error", "aws_architecture_pending", {
    request_id: requestId,
    architecture_status: awsArchitectureStatus,
  });
  return response("aws_architecture_pending", requestId, startedAt);
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const requestId = resolveRequestId(request);
  try {
    const provider = assertPlatformRuntimePolicy();
    return provider === "aws"
      ? awsReadiness(requestId, startedAt)
      : supabaseReadiness(requestId, startedAt);
  } catch (error) {
    logReadiness("error", "runtime_policy_rejected", {
      request_id: requestId,
      error_name: error instanceof Error ? error.name : null,
    });
    return response("runtime_policy_rejected", requestId, startedAt);
  }
}
