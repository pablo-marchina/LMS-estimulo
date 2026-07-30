import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const currentIdentityOperation = "e14_resolve_current_identity";
const allowedRpcs = new Set(`
abort_announcement_banner_upload
abort_external_credential_upload
abort_library_upload
abort_practice_upload
archive_admin_interface_content
attach_library_content_to_activity
clear_admin_activity_parts
confirm_announcement_banner_upload
confirm_certificate_template_upload
confirm_external_credential_upload
confirm_library_upload
confirm_practice_upload
configure_admin_path_template
configure_certificate_version
create_activity_comment
create_admin_journey_draft_from_version
create_announcement_banner_upload_intent
create_certificate_template_upload_intent
create_external_credential_upload_intent
create_library_upload_intent
create_practice_upload_intent
e14_acknowledge_section
e14_complete_diagnostic
e14_create_enrollment
e14_get_operator_result
e14_get_operator_workspace
e14_get_participant_experience
e14_get_participant_state
e14_list_eligible_journeys
e14_list_operator_instances
e14_list_participant_journeys
e14_publish_vertical
e14_record_diagnostic_response
e14_record_quick_check_answer
e14_self_enroll
e14_start_activity
e14_start_diagnostic
e14_start_journey
e14_start_quick_check
e14_submit_quick_check
ensure_participant_default_path
focus_participant_activity
get_activity_asset_download
get_activity_utility_rating
get_admin_interface_content
get_admin_journey_editor_details
get_admin_product_workspace
get_admin_reporting_dashboard
get_announcement_banner_download
get_business_maturity_draft
get_certificate_render_payload
get_external_credential_download
get_journey_cover_download
get_library_content
get_library_file_download
get_participant_diagnostic_summary
get_participant_engagement_hub
get_participant_experience_with_default_diagnostic
get_participant_journey_outline
get_participant_profile_summary
get_practice_download_descriptor
grant_organization_role
issue_learning_credentials
list_activity_comments
list_admin_identity_resolution_cases
list_external_credential_issuers
list_library_content
list_operator_activity_comments
list_operator_announcements
list_operator_library_content
list_operator_practice_submissions
list_organization_role_management
list_participant_credentials
list_participant_external_credentials
list_participant_point_rules
list_practice_submissions
moderate_activity_comment
persist_configurable_product_result
provision_public_signup_participant_v3
publish_admin_interface_content
publish_admin_journey_version
publish_certificate_version
publish_library_content
rate_activity_utility
record_activity_asset_progress
record_library_content_access
register_admin_interface_content
resolve_admin_identity_resolution_case
resolve_participant_diagnostic_entry
retire_admin_diagnostic
review_practice_submission
revoke_organization_role
save_admin_interface_content
save_admin_journey
save_admin_lesson
save_admin_path_badge
save_admin_product_resource
save_admin_track
save_library_content_draft
save_operator_announcement
set_participant_application_objective
`.trim().split(/\s+/u));

const participantOnlyRpcs = new Set(`
abort_external_credential_upload
abort_practice_upload
confirm_external_credential_upload
confirm_practice_upload
create_activity_comment
create_external_credential_upload_intent
create_practice_upload_intent
e14_acknowledge_section
e14_complete_diagnostic
e14_get_participant_experience
e14_get_participant_state
e14_list_eligible_journeys
e14_list_participant_journeys
e14_record_diagnostic_response
e14_record_quick_check_answer
e14_self_enroll
e14_start_activity
e14_start_diagnostic
e14_start_journey
e14_start_quick_check
e14_submit_quick_check
ensure_participant_default_path
focus_participant_activity
get_activity_asset_download
get_activity_utility_rating
get_business_maturity_draft
get_certificate_render_payload
get_external_credential_download
get_journey_cover_download
get_library_content
get_library_file_download
get_participant_diagnostic_summary
get_participant_engagement_hub
get_participant_experience_with_default_diagnostic
get_participant_journey_outline
get_participant_profile_summary
get_practice_download_descriptor
issue_learning_credentials
list_activity_comments
list_external_credential_issuers
list_library_content
list_participant_credentials
list_participant_external_credentials
list_participant_point_rules
list_practice_submissions
rate_activity_utility
record_activity_asset_progress
record_library_content_access
resolve_participant_diagnostic_entry
set_participant_application_objective
`.trim().split(/\s+/u));

const legacyActorArgument = new Set(`e14_acknowledge_section e14_complete_diagnostic e14_get_operator_result e14_get_participant_state e14_record_quick_check_answer e14_start_activity e14_start_quick_check e14_submit_quick_check`.split(/\s+/u));
const userAccountActorArgument = new Set(["provision_public_signup_participant_v3"]);

type AccessMode = "participant" | "administrative" | "onboarding_required";
type MetricSet = Partial<Record<"auth" | "identity" | "rpc", number>>;
type BurstWindow = { startedAt: number; count: number; lastSeenAt: number };
type BodyReadResult = { ok: true; text: string } | { ok: false };

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
// Supabase is restricted to development, test and preview. This local limiter is
// defense-in-depth for that test gateway; the definitive AWS edge control is an
// explicit production architecture decision and must not be inferred here.
const burstWindows = new Map<string, BurstWindow>();

function configuredInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = Deno.env.get(name)?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function configuredSampleRate(): number {
  const raw = Number(Deno.env.get("AUTHENTICATED_RPC_LOG_SAMPLE_RATE") ?? "0.1");
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.1;
}

const maxBodyBytes = () => configuredInteger("AUTHENTICATED_RPC_MAX_BODY_BYTES", 262_144, 1_024, 1_048_576);
const upstreamTimeoutMs = () => configuredInteger("AUTHENTICATED_RPC_UPSTREAM_TIMEOUT_MS", 10_000, 1_000, 60_000);
const burstLimit = () => configuredInteger("AUTHENTICATED_RPC_BURST_LIMIT", 120, 10, 10_000);
const burstWindowMs = () => configuredInteger("AUTHENTICATED_RPC_BURST_WINDOW_MS", 60_000, 1_000, 3_600_000);

function resolveRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id") ?? "";
  return requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
}

function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown>): void {
  const payload = JSON.stringify({ level, event, component: "authenticated_rpc", ...fields });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

function serverTiming(startedAt: number, metrics: MetricSet): string {
  return [
    `total;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`,
    ...Object.entries(metrics).map(([name, duration]) => `${name};dur=${Math.max(0, duration ?? 0).toFixed(1)}`),
  ].join(", ");
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  context: { id: string; startedAt: number; operation?: string; metrics?: MetricSet; headers?: HeadersInit },
): Response {
  const durationMs = Math.max(0, performance.now() - context.startedAt);
  if (status >= 400 || Math.random() < configuredSampleRate()) {
    log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "request_completed", {
      request_id: context.id,
      operation: context.operation ?? null,
      status,
      duration_ms: Number(durationMs.toFixed(1)),
      ...Object.fromEntries(Object.entries(context.metrics ?? {}).map(([key, value]) => [`${key}_ms`, Number((value ?? 0).toFixed(1))])),
    });
  }
  const headers = new Headers(context.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-request-id", context.id);
  headers.set("server-timing", serverTiming(context.startedAt, context.metrics ?? {}));
  return new Response(JSON.stringify(body), { status, headers });
}

async function readBodyWithLimit(request: Request, limit: number): Promise<BodyReadResult> {
  if (!request.body) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("payload_too_large");
        return { ok: false };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(body) };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const propagateAbort = () => controller.abort(upstreamSignal?.reason);
  upstreamSignal?.addEventListener("abort", propagateAbort, { once: true });
  const timeout = setTimeout(() => controller.abort("upstream_timeout"), upstreamTimeoutMs());
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", propagateAbort);
  }
}

function cleanupBurstWindows(now: number): void {
  if (burstWindows.size < 5_000) return;
  const staleBefore = now - burstWindowMs() * 2;
  for (const [key, value] of burstWindows) {
    if (value.lastSeenAt < staleBefore || burstWindows.size > 4_000) burstWindows.delete(key);
    if (burstWindows.size <= 4_000) break;
  }
}

function consumeBurst(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  cleanupBurstWindows(now);
  const windowLength = burstWindowMs();
  const current = burstWindows.get(key);
  if (!current || now - current.startedAt >= windowLength) {
    burstWindows.set(key, { startedAt: now, count: 1, lastSeenAt: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.lastSeenAt = now;
  if (current.count >= burstLimit()) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowLength - (now - current.startedAt)) / 1_000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

async function fingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function resolveAccessMode(identity: Record<string, unknown>, email: string, provider: string): AccessMode {
  if (typeof identity.entrepreneur_id === "string" && identity.entrepreneur_id) return "participant";
  if (identity.access_mode === "administrative" || identity.access_mode === "onboarding_required") return identity.access_mode;
  const organizations = Array.isArray(identity.organizations) ? identity.organizations : [];
  if ((provider === "google" && email.endsWith("@estimulo.org")) || organizations.length > 0) return "administrative";
  return "onboarding_required";
}

function nextPath(accessMode: AccessMode): string {
  if (accessMode === "participant") return "/empreendedor";
  if (accessMode === "administrative") return "/admin";
  return "/cadastro/concluir?retorno=perfil_incompleto";
}

function rpcFailure(error: { code?: string | null } | null): { status: number; code: string; message: string } {
  const code = error?.code?.trim() || "RPC_EXECUTION_FAILED";
  if (code === "42501") return { status: 403, code, message: "The operation is not permitted." };
  if (code === "P0002") return { status: 404, code, message: "The requested resource was not found." };
  if (["23503", "23505", "P0001"].includes(code)) return { status: 409, code, message: "The operation conflicts with the current resource state." };
  if (["22023", "23502", "23514"].includes(code)) return { status: 400, code, message: "The operation contains invalid data." };
  return { status: 500, code, message: "The operation could not be completed." };
}

async function handleRequest(request: Request): Promise<Response> {
  const startedAt = performance.now();
  const id = resolveRequestId(request);
  const metrics: MetricSet = {};
  let operation = "";

  if (request.method !== "POST") return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST required" }, { id, startedAt, headers: { allow: "POST" } });
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/u.test(contentType)) {
    return jsonResponse(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON content type required" }, { id, startedAt });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes()) {
    return jsonResponse(413, { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" }, { id, startedAt });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return jsonResponse(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "Missing bearer token" }, { id, startedAt });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID", message: "Runtime configuration is unavailable" }, { id, startedAt });
  }

  const bodyRead = await readBodyWithLimit(request, maxBodyBytes());
  if (!bodyRead.ok) return jsonResponse(413, { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" }, { id, startedAt });
  let payload: { name?: unknown; args?: unknown };
  try {
    payload = JSON.parse(bodyRead.text) as { name?: unknown; args?: unknown };
  } catch {
    return jsonResponse(400, { ok: false, code: "INVALID_JSON", message: "JSON body required" }, { id, startedAt });
  }
  operation = typeof payload.name === "string" ? payload.name : "";
  const args = payload.args && typeof payload.args === "object" && !Array.isArray(payload.args) ? payload.args as Record<string, unknown> : null;
  if ((!allowedRpcs.has(operation) && operation !== currentIdentityOperation) || !args) {
    return jsonResponse(400, { ok: false, code: "RPC_NOT_ALLOWED", message: "RPC is not allowlisted" }, { id, startedAt, operation });
  }

  const authStartedAt = performance.now();
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: fetchWithTimeout },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  metrics.auth = performance.now() - authStartedAt;
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase() ?? "";
  const provider = typeof user?.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
  if (userError || !user?.email_confirmed_at || !email || !["email", "google"].includes(provider)) {
    return jsonResponse(401, { ok: false, code: "VERIFIED_SESSION_REQUIRED", message: "Session could not be verified" }, { id, startedAt, operation, metrics });
  }

  const burst = consumeBurst(`${user.id}:${operation}`);
  if (!burst.allowed) {
    return jsonResponse(429, { ok: false, code: "RATE_LIMITED", message: "Too many requests" }, { id, startedAt, operation, metrics, headers: { "retry-after": String(burst.retryAfterSeconds) } });
  }

  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const claimsFingerprint = await fingerprint({ issuer, subject: user.id, email, provider, audience: user.aud, appMetadata: user.app_metadata });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: fetchWithTimeout },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const identityStartedAt = performance.now();
  const { data: identityData, error: identityError } = await admin.rpc("e14_resolve_identity", {
    p_provider: provider,
    p_issuer: issuer,
    p_subject: user.id,
    p_email_normalized: email,
    p_email_verified: true,
    p_claims_fingerprint: claimsFingerprint,
  });
  metrics.identity = performance.now() - identityStartedAt;
  const identity = identityData && typeof identityData === "object" && !Array.isArray(identityData) ? identityData as Record<string, unknown> : null;
  if (identityError || !identity?.user_account_id) {
    return jsonResponse(403, { ok: false, code: identityError?.code ?? "IDENTITY_RESOLUTION_FAILED", message: "Internal identity unavailable" }, { id, startedAt, operation, metrics });
  }

  const accessMode = resolveAccessMode(identity, email, provider);
  const resolvedIdentity = { ...identity, authenticated_email: email, authenticated_provider: provider, access_mode: accessMode, next_path: nextPath(accessMode) };
  if (operation === currentIdentityOperation) return jsonResponse(200, { ok: true, data: resolvedIdentity }, { id, startedAt, operation, metrics });

  const actorArgument = legacyActorArgument.has(operation) ? "a" : userAccountActorArgument.has(operation) ? "p_user_account_id" : "p_actor_user_account_id";
  if (args[actorArgument] !== identity.user_account_id) {
    return jsonResponse(403, { ok: false, code: "ACTOR_MISMATCH", message: "RPC actor does not match the authenticated identity" }, { id, startedAt, operation, metrics });
  }
  if (participantOnlyRpcs.has(operation) && accessMode !== "participant") {
    return jsonResponse(409, {
      ok: false,
      code: accessMode === "administrative" ? "ADMINISTRATIVE_ACCESS_REQUIRED" : "PARTICIPANT_PROFILE_REQUIRED",
      message: accessMode === "administrative" ? "This identity belongs to the administrative area." : "Participant profile completion is required.",
      next_path: nextPath(accessMode),
    }, { id, startedAt, operation, metrics });
  }

  const rpcStartedAt = performance.now();
  const { data, error } = await admin.rpc(operation, args);
  metrics.rpc = performance.now() - rpcStartedAt;
  if (error) {
    const failure = rpcFailure(error);
    return jsonResponse(failure.status, { ok: false, code: failure.code, message: failure.message }, { id, startedAt, operation, metrics });
  }
  return jsonResponse(200, { ok: true, data }, { id, startedAt, operation, metrics });
}

Deno.serve(async (request: Request) => {
  const startedAt = performance.now();
  try {
    return await handleRequest(request);
  } catch (error) {
    const id = resolveRequestId(request);
    log("error", "unhandled_error", { request_id: id, error_name: error instanceof Error ? error.name : "unknown" });
    return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "The request could not be completed" }, { id, startedAt });
  }
});
