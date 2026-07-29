import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSupabaseEnv } from "@/lib/env";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { createSessionClient } from "@/lib/supabase/server";

export class AuthenticatedGatewayError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthenticatedGatewayError";
  }
}

type GatewaySuccess<T> = { ok: true; data: T };
type GatewayFailure = { ok: false; code?: string; message?: string };
type ReleaseSlot = () => void;
type SlotWaiter = {
  resolve: (release: ReleaseSlot) => void;
  reject: (error: AuthenticatedGatewayError) => void;
  timer: ReturnType<typeof setTimeout>;
};

let activeGatewayRequests = 0;
const gatewayWaiters: SlotWaiter[] = [];

function configuredInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new AuthenticatedGatewayError(
      `${name}_INVALID`,
      `The ${name.toLowerCase()} setting is invalid.`,
    );
  }
  return value;
}

function gatewayTimeoutMs(): number {
  return configuredInteger("RPC_GATEWAY_TIMEOUT_MS", 10_000, 1_000, 60_000);
}

function gatewayPayloadLimitBytes(): number {
  return configuredInteger("RPC_GATEWAY_MAX_PAYLOAD_BYTES", 262_144, 1_024, 1_048_576);
}

function gatewayConcurrencyLimit(): number {
  return configuredInteger("RPC_GATEWAY_MAX_CONCURRENCY", 32, 1, 256);
}

function gatewayQueueLimit(): number {
  return configuredInteger("RPC_GATEWAY_MAX_QUEUE", 128, 0, 2_048);
}

function gatewayQueueTimeoutMs(): number {
  return configuredInteger("RPC_GATEWAY_QUEUE_TIMEOUT_MS", 1_000, 50, 30_000);
}

function releaseGatewaySlot(): void {
  activeGatewayRequests = Math.max(0, activeGatewayRequests - 1);
  const next = gatewayWaiters.shift();
  if (!next) return;
  clearTimeout(next.timer);
  activeGatewayRequests += 1;
  next.resolve(releaseGatewaySlot);
}

async function acquireGatewaySlot(): Promise<ReleaseSlot> {
  if (activeGatewayRequests < gatewayConcurrencyLimit()) {
    activeGatewayRequests += 1;
    return releaseGatewaySlot;
  }

  if (gatewayWaiters.length >= gatewayQueueLimit()) {
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_OVERLOADED",
      "The authenticated RPC gateway is temporarily overloaded.",
    );
  }

  return new Promise<ReleaseSlot>((resolve, reject) => {
    const waiter: SlotWaiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = gatewayWaiters.indexOf(waiter);
        if (index >= 0) gatewayWaiters.splice(index, 1);
        reject(new AuthenticatedGatewayError(
          "RPC_GATEWAY_QUEUE_TIMEOUT",
          "The authenticated RPC gateway queue timed out.",
        ));
      }, gatewayQueueTimeoutMs()),
    };
    gatewayWaiters.push(waiter);
  });
}

function logGateway(
  level: "info" | "error",
  event: string,
  fields: Record<string, unknown>,
): void {
  const payload = JSON.stringify({ level, event, component: "authenticated_gateway", ...fields });
  if (level === "error") console.error(payload);
  else console.log(payload);
}

async function invokeSupabaseGateway<T>(
  name: string,
  args: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<T> {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  const sessionClient = client ?? await createSessionClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new AuthenticatedGatewayError(
      "AUTHENTICATED_SESSION_REQUIRED",
      "An authenticated session is required.",
    );
  }

  const body = JSON.stringify({ name, args });
  const payloadBytes = Buffer.byteLength(body, "utf8");
  if (payloadBytes > gatewayPayloadLimitBytes()) {
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_PAYLOAD_TOO_LARGE",
      "The authenticated RPC request is too large.",
    );
  }

  const releaseSlot = await acquireGatewaySlot();
  const { url } = publicSupabaseEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), gatewayTimeoutMs());

  logGateway("info", "request_started", {
    request_id: requestId,
    operation: name,
    payload_bytes: payloadBytes,
    active_requests: activeGatewayRequests,
    queued_requests: gatewayWaiters.length,
  });

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/functions/v1/authenticated-rpc`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: GatewaySuccess<T> | GatewayFailure;
    try {
      payload = await response.json() as GatewaySuccess<T> | GatewayFailure;
    } catch {
      throw new AuthenticatedGatewayError(
        "RPC_GATEWAY_INVALID_RESPONSE",
        "The authenticated RPC gateway returned an invalid response.",
      );
    }

    const durationMs = Math.max(0, performance.now() - startedAt);
    logGateway(response.ok && payload.ok ? "info" : "error", "request_completed", {
      request_id: response.headers.get("x-request-id") ?? requestId,
      operation: name,
      status: response.status,
      duration_ms: Number(durationMs.toFixed(1)),
      upstream_timing: response.headers.get("server-timing"),
    });

    if (!response.ok) {
      const failure = payload as GatewayFailure;
      throw new AuthenticatedGatewayError(
        failure.code ?? `RPC_GATEWAY_HTTP_${response.status}`,
        failure.message ?? "The authenticated RPC gateway rejected the request.",
      );
    }
    if (!payload.ok) {
      const failure = payload as GatewayFailure;
      throw new AuthenticatedGatewayError(
        failure.code ?? "RPC_GATEWAY_REJECTED",
        failure.message ?? "The authenticated RPC gateway rejected the request.",
      );
    }

    return payload.data;
  } catch (error) {
    if (error instanceof AuthenticatedGatewayError) throw error;

    const durationMs = Math.max(0, performance.now() - startedAt);
    if (error instanceof Error && error.name === "AbortError") {
      logGateway("error", "request_timed_out", {
        request_id: requestId,
        operation: name,
        duration_ms: Number(durationMs.toFixed(1)),
      });
      throw new AuthenticatedGatewayError(
        "RPC_GATEWAY_TIMEOUT",
        "The authenticated RPC gateway timed out.",
      );
    }
    logGateway("error", "request_unavailable", {
      request_id: requestId,
      operation: name,
      duration_ms: Number(durationMs.toFixed(1)),
    });
    throw new AuthenticatedGatewayError(
      "RPC_GATEWAY_UNAVAILABLE",
      "The authenticated RPC gateway is unavailable.",
    );
  } finally {
    clearTimeout(timeout);
    releaseSlot();
  }
}

export async function invokeAuthenticatedGateway<T>(
  name: string,
  args: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<T> {
  const provider = platformRuntimeProvider();
  if (provider === "supabase") return invokeSupabaseGateway<T>(name, args, client);

  // The AWS adapter will resolve the Cognito identity and execute approved PostgreSQL
  // operations through RDS Proxy. Until that implementation exists, fail closed.
  throw new AuthenticatedGatewayError(
    "AWS_RPC_GATEWAY_NOT_IMPLEMENTED",
    "The AWS authenticated RPC adapter is not implemented.",
  );
}
