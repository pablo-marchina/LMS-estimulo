import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const allowed = new Set([
  "get_announcement_banner_download",
  "get_journey_cover_download",
  "get_participant_lesson_thumbnail_download",
  "get_reward_image_download",
  "get_interface_content_image_download",
]);
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;

type Failure = { code?: string | null; message?: string | null } | null;

function reply(status: number, body: Record<string, unknown>, requestId: string, startedAt: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
      "server-timing": `total;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`,
    },
  });
}

function failure(error: Failure) {
  const code = error?.code?.trim() || "MEDIA_DESCRIPTOR_FAILED";
  if (code === "42501") return { status: 403, code, message: "The operation is not permitted." };
  if (code === "P0002") return { status: 404, code, message: "The requested media was not found." };
  if (["22023", "23502", "23514", "22P02"].includes(code)) return { status: 400, code, message: "The media request is invalid." };
  return { status: 500, code, message: "The media descriptor could not be resolved." };
}

async function fingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const startedAt = performance.now();
  const candidate = request.headers.get("x-request-id") ?? "";
  const requestId = requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
  if (request.method !== "POST") return reply(405, { ok: false, code: "METHOD_NOT_ALLOWED" }, requestId, startedAt);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return reply(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE" }, requestId, startedAt);
  }

  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
  if (!token) return reply(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED" }, requestId, startedAt);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return reply(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID" }, requestId, startedAt);
  }

  let payload: { name?: unknown; args?: unknown };
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 65_536) return reply(413, { ok: false, code: "PAYLOAD_TOO_LARGE" }, requestId, startedAt);
    payload = JSON.parse(text) as { name?: unknown; args?: unknown };
  } catch {
    return reply(400, { ok: false, code: "INVALID_JSON" }, requestId, startedAt);
  }

  const name = typeof payload.name === "string" ? payload.name : "";
  const args = payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)
    ? { ...(payload.args as Record<string, unknown>) }
    : null;
  if (!allowed.has(name) || !args) return reply(400, { ok: false, code: "MEDIA_RPC_NOT_ALLOWED" }, requestId, startedAt);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase() ?? "";
  const provider = typeof user?.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
  if (userError || !user?.email_confirmed_at || !email || !["email", "google"].includes(provider)) {
    return reply(401, { ok: false, code: "VERIFIED_SESSION_REQUIRED" }, requestId, startedAt);
  }

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
  const identity = identityData && typeof identityData === "object" && !Array.isArray(identityData)
    ? identityData as Record<string, unknown>
    : null;
  const userAccountId = typeof identity?.user_account_id === "string" ? identity.user_account_id : "";
  if (identityError || !userAccountId) return reply(403, { ok: false, code: "IDENTITY_RESOLUTION_FAILED" }, requestId, startedAt);

  // Never trust an actor supplied by the caller. Media descriptors always execute as
  // the authenticated internal identity, and the SECURITY DEFINER RPC performs the
  // domain-level authorization for the requested resource.
  args.p_actor_user_account_id = userAccountId;
  const { data, error } = await serviceClient.rpc(name, args);
  if (error) {
    const mapped = failure(error);
    return reply(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId, startedAt);
  }
  return reply(200, { ok: true, data }, requestId, startedAt);
});
