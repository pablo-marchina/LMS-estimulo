import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import { ExtensionsGatewayError, invokePlatformExtensionsGateway } from "@/lib/extensions/gateway";
import {
  INTERFACE_PREVIEW_COOKIE,
  INTERFACE_PREVIEW_REQUEST_HEADER,
  parseInterfacePreviewIdentity,
} from "@/lib/interface-preview/constants";
import { legacyRpcNames } from "@/lib/journey-runtime/legacy-rpc-arguments";
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

const previewReadOnlyRpcs = new Set([
  "e14_get_participant_experience",
  legacyRpcNames.getParticipantState,
  "e14_list_eligible_journeys",
  "e14_list_participant_journeys",
  "get_activity_asset_download",
  "get_activity_utility_rating",
  "get_announcement_banner_download",
  "get_business_maturity_draft",
  "get_certificate_render_payload",
  "get_external_credential_download",
  "get_journey_cover_download",
  "get_library_content",
  "get_library_file_download",
  "get_participant_diagnostic_summary",
  "get_participant_engagement_hub",
  "get_participant_experience_with_default_diagnostic",
  "get_participant_journey_outline",
  "get_participant_profile_summary",
  "get_practice_download_descriptor",
  "list_activity_comments",
  "list_external_credential_issuers",
  "list_library_content",
  "list_participant_credentials",
  "list_participant_external_credentials",
  "list_participant_point_rules",
  "list_practice_submissions",
  "resolve_participant_diagnostic_entry",
]);

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

async function previewIdentity() {
  const requestHeaders = await headers();
  if (requestHeaders.get(INTERFACE_PREVIEW_REQUEST_HEADER) !== "1") return null;
  const cookieStore = await cookies();
  return parseInterfacePreviewIdentity(cookieStore.get(INTERFACE_PREVIEW_COOKIE)?.value);
}

async function invokePreviewGateway<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  if (name === "e14_resolve_current_identity") return null;
  const preview = await previewIdentity();
  if (!preview) return null;
  if (!previewReadOnlyRpcs.has(name)) {
    throw new AuthenticatedGatewayError("INTERFACE_PREVIEW_WRITE_BLOCKED", "Preview requests are read-only.");
  }
  try {
    return await invokePlatformExtensionsGateway<T>("preview_participant_rpc", {
      p_organization_id: preview.organizationId,
      p_preview_user_account_id: preview.participantUserAccountId,
      p_operation: name,
      p_args: args,
    });
  } catch (error) {
    if (error instanceof ExtensionsGatewayError) {
      throw new AuthenticatedGatewayError(error.code, error.message);
    }
    throw error;
  }
}

async function invokeSupabaseGateway<T>(
  name: string,
  args: Record<string, unknown>,
  client?: SupabaseClient,
): Promise<T> {
  const previewResult = await invokePreviewGateway<T>(name, args);
  if (previewResult !== null) return previewResult;

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

  throw new AuthenticatedGatewayError(
    "AWS_DATA_ARCHITECTURE_PENDING",
    "The AWS authenticated data architecture is pending approval.",
  );
}
