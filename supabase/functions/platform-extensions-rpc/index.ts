import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const allowed = new Set([
  "get_admin_extensions_workspace",
  "get_admin_ai_grading_provider",
  "save_ai_grading_provider",
  "save_admin_extension",
  "get_participant_extensions",
  "perform_participant_extension",
  "create_reward_image_upload_intent",
  "confirm_reward_image_upload",
  "abort_reward_image_upload",
  "get_reward_image_download",
  "preview_participant_rpc",
  "preview_participant_extensions",
]);
const previewReadOnlyRpcs = new Set([
  "e14_get_participant_experience",
  "e14_get_participant_state",
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
const legacyActorArgument = new Set(["e14_get_participant_state"]);
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const semanticCodePattern = /\b([A-Z][A-Z0-9_]{2,127})\b/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const previewPermissions = new Set(["participant.manage", "journey.execution.read", "journey.execution.manage"]);

function response(status: number, body: Record<string, unknown>, requestId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
    },
  });
}
function semanticCode(error: { code?: string | null; message?: string | null } | null) {
  const candidate = error?.message?.match(semanticCodePattern)?.[1] ?? "";
  return candidate.startsWith("BEHAVIOR_") ? candidate : null;
}
function failure(error: { code?: string | null; message?: string | null } | null) {
  const sqlState = error?.code?.trim() || "EXTENSION_RPC_FAILED";
  const domainCode = semanticCode(error);
  if (sqlState === "42501") return { status: 403, code: domainCode ?? sqlState, message: "The operation is not permitted." };
  if (sqlState === "P0002") return { status: 404, code: domainCode ?? sqlState, message: "The requested resource was not found." };
  if (["23503", "23505", "P0001"].includes(sqlState)) return { status: 409, code: domainCode ?? sqlState, message: "The operation conflicts with the current resource state." };
  if (["22023", "23502", "23514", "22P02"].includes(sqlState)) return { status: 400, code: domainCode ?? sqlState, message: "The operation contains invalid data." };
  return { status: 500, code: domainCode ?? sqlState, message: "The operation could not be completed." };
}
async function fingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function administrativeOrganization(identity: Record<string, unknown>, organizationId: string) {
  const organizations = Array.isArray(identity.organizations) ? identity.organizations : [];
  return organizations.map(record).find((organization) => {
    if (!organization || organization.organization_id !== organizationId) return false;
    const permissions = Array.isArray(organization.permissions) ? organization.permissions.map(String) : [];
    return permissions.some((permission) => previewPermissions.has(permission));
  }) ?? null;
}
async function validatePreviewParticipant(
  serviceClient: ReturnType<typeof createClient>,
  actorUserAccountId: string,
  organizationId: string,
  previewUserAccountId: string,
) {
  const { data, error } = await serviceClient.rpc("get_admin_extensions_workspace", {
    p_actor_user_account_id: actorUserAccountId,
    p_organization_id: organizationId,
  });
  if (error) return { ok: false as const, error };
  const workspace = record(data);
  const participants = Array.isArray(workspace?.participants) ? workspace.participants.map(record) : [];
  const participant = participants.find((item) => item?.user_account_id === previewUserAccountId && typeof item.entrepreneur_id === "string");
  return participant ? { ok: true as const } : { ok: false as const, error: { code: "P0002", message: "INTERFACE_PREVIEW_PARTICIPANT_UNAVAILABLE" } };
}

Deno.serve(async (request: Request) => {
  const requestIdCandidate = request.headers.get("x-request-id") ?? "";
  const requestId = requestIdPattern.test(requestIdCandidate) ? requestIdCandidate : crypto.randomUUID();
  if (request.method !== "POST") return response(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST required" }, requestId);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return response(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON required" }, requestId);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/iu, "").trim();
  if (!token) return response(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "Missing bearer token" }, requestId);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID", message: "Runtime configuration is unavailable" }, requestId);

  let payload: { name?: unknown; args?: unknown };
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 1_048_576) return response(413, { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" }, requestId);
    payload = JSON.parse(text) as { name?: unknown; args?: unknown };
  } catch {
    return response(400, { ok: false, code: "INVALID_JSON", message: "JSON body required" }, requestId);
  }

  const name = typeof payload.name === "string" ? payload.name : "";
  const args = record(payload.args) ? { ...(payload.args as Record<string, unknown>) } : null;
  if (!allowed.has(name) || !args) return response(400, { ok: false, code: "RPC_NOT_ALLOWED", message: "RPC is not allowlisted" }, requestId);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase() ?? "";
  const provider = typeof user?.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
  if (userError || !user?.email_confirmed_at || !email || !["email", "google"].includes(provider)) return response(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "A confirmed session is required" }, requestId);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const claimsFingerprint = await fingerprint({ issuer, subject: user.id, email, provider, audience: user.aud, appMetadata: user.app_metadata });
  const { data: identityData, error: identityError } = await serviceClient.rpc("e14_resolve_identity", {
    p_provider: provider,
    p_issuer: issuer,
    p_subject: user.id,
    p_email_normalized: email,
    p_email_verified: true,
    p_claims_fingerprint: claimsFingerprint,
  });
  const identity = record(identityData);
  const userAccountId = typeof identity?.user_account_id === "string" ? identity.user_account_id : "";
  if (identityError || !userAccountId) return response(403, { ok: false, code: identityError?.code ?? "IDENTITY_NOT_LINKED", message: "The authenticated identity is not active" }, requestId);

  if (name === "preview_participant_rpc" || name === "preview_participant_extensions") {
    const organizationId = typeof args.p_organization_id === "string" ? args.p_organization_id : "";
    const previewUserAccountId = typeof args.p_preview_user_account_id === "string" ? args.p_preview_user_account_id : "";
    if (!uuidPattern.test(organizationId) || !uuidPattern.test(previewUserAccountId)) {
      return response(400, { ok: false, code: "INTERFACE_PREVIEW_IDENTITY_INVALID", message: "The preview identity is invalid" }, requestId);
    }
    if (!email.endsWith("@estimulo.org") || !administrativeOrganization(identity, organizationId)) {
      return response(403, { ok: false, code: "INTERFACE_PREVIEW_ADMIN_REQUIRED", message: "Administrative preview access is required" }, requestId);
    }
    const validation = await validatePreviewParticipant(serviceClient, userAccountId, organizationId, previewUserAccountId);
    if (!validation.ok) {
      const mapped = failure(validation.error);
      return response(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId);
    }

    if (name === "preview_participant_extensions") {
      const { data, error } = await serviceClient.rpc("get_participant_extensions", {
        p_actor_user_account_id: previewUserAccountId,
      });
      if (error) {
        const mapped = failure(error);
        return response(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId);
      }
      return response(200, { ok: true, data }, requestId);
    }

    const operation = typeof args.p_operation === "string" ? args.p_operation : "";
    const rpcArgs = record(args.p_args) ? { ...(args.p_args as Record<string, unknown>) } : null;
    if (!previewReadOnlyRpcs.has(operation) || !rpcArgs) {
      return response(403, { ok: false, code: "INTERFACE_PREVIEW_WRITE_BLOCKED", message: "Preview requests are read-only" }, requestId);
    }
    const actorArgument = legacyActorArgument.has(operation) ? "a" : "p_actor_user_account_id";
    rpcArgs[actorArgument] = previewUserAccountId;
    const { data, error } = await serviceClient.rpc(operation, rpcArgs);
    if (error) {
      const mapped = failure(error);
      return response(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId);
    }
    return response(200, { ok: true, data }, requestId);
  }

  args.p_actor_user_account_id = userAccountId;
  const { data, error } = await serviceClient.rpc(name, args);
  if (error) {
    const mapped = failure(error);
    console.error(JSON.stringify({ event: "extension_rpc_failed", request_id: requestId, operation: name, sql_state: error.code, code: mapped.code }));
    return response(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId);
  }
  return response(200, { ok: true, data }, requestId);
});
