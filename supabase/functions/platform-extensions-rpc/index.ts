import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const allowed = new Set(["get_admin_extensions_workspace", "get_admin_ai_grading_provider", "save_ai_grading_provider", "save_admin_extension", "get_participant_extensions", "perform_participant_extension"]);
const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const semanticCodePattern = /\b([A-Z][A-Z0-9_]{2,127})\b/u;
function response(status: number, body: Record<string, unknown>, requestId: string) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-request-id": requestId } }); }
function semanticCode(error: { code?: string | null; message?: string | null } | null) { const candidate = error?.message?.match(semanticCodePattern)?.[1] ?? ""; return candidate.startsWith("BEHAVIOR_") ? candidate : null; }
function failure(error: { code?: string | null; message?: string | null } | null) {
  const sqlState = error?.code?.trim() || "EXTENSION_RPC_FAILED";
  const domainCode = semanticCode(error);
  if (sqlState === "42501") return { status: 403, code: domainCode ?? sqlState, message: "The operation is not permitted." };
  if (sqlState === "P0002") return { status: 404, code: domainCode ?? sqlState, message: "The requested resource was not found." };
  if (["23503", "23505", "P0001"].includes(sqlState)) return { status: 409, code: domainCode ?? sqlState, message: "The operation conflicts with the current resource state." };
  if (["22023", "23502", "23514", "22P02"].includes(sqlState)) return { status: 400, code: domainCode ?? sqlState, message: "The operation contains invalid data." };
  return { status: 500, code: domainCode ?? sqlState, message: "The operation could not be completed." };
}
async function fingerprint(value: unknown) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (request: Request) => {
  const requestIdCandidate = request.headers.get("x-request-id") ?? "";
  const requestId = requestIdPattern.test(requestIdCandidate) ? requestIdCandidate : crypto.randomUUID();
  if (request.method !== "POST") return response(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST required" }, requestId);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return response(415, { ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON required" }, requestId);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/iu, "").trim();
  if (!token) return response(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "Missing bearer token" }, requestId);
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const anonKey = Deno.env.get("SUPABASE_ANON_KEY"); const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID", message: "Runtime configuration is unavailable" }, requestId);
  let payload: { name?: unknown; args?: unknown };
  try { const text = await request.text(); if (new TextEncoder().encode(text).byteLength > 1_048_576) return response(413, { ok: false, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" }, requestId); payload = JSON.parse(text) as { name?: unknown; args?: unknown }; }
  catch { return response(400, { ok: false, code: "INVALID_JSON", message: "JSON body required" }, requestId); }
  const name = typeof payload.name === "string" ? payload.name : "";
  const args = payload.args && typeof payload.args === "object" && !Array.isArray(payload.args) ? { ...(payload.args as Record<string, unknown>) } : null;
  if (!allowed.has(name) || !args) return response(400, { ok: false, code: "RPC_NOT_ALLOWED", message: "RPC is not allowlisted" }, requestId);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const user = userData.user; const email = user?.email?.trim().toLowerCase() ?? ""; const provider = typeof user?.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
  if (userError || !user?.email_confirmed_at || !email || !["email", "google"].includes(provider)) return response(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "A confirmed session is required" }, requestId);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const claimsFingerprint = await fingerprint({ issuer, subject: user.id, email, provider, audience: user.aud, appMetadata: user.app_metadata });
  const { data: identityData, error: identityError } = await serviceClient.rpc("e14_resolve_identity", { p_provider: provider, p_issuer: issuer, p_subject: user.id, p_email_normalized: email, p_email_verified: true, p_claims_fingerprint: claimsFingerprint });
  const identity = identityData && typeof identityData === "object" && !Array.isArray(identityData) ? identityData as Record<string, unknown> : null;
  const userAccountId = typeof identity?.user_account_id === "string" ? identity.user_account_id : "";
  if (identityError || !userAccountId) return response(403, { ok: false, code: identityError?.code ?? "IDENTITY_NOT_LINKED", message: "The authenticated identity is not active" }, requestId);
  args.p_actor_user_account_id = userAccountId;
  const { data, error } = await serviceClient.rpc(name, args);
  if (error) { const mapped = failure(error); console.error(JSON.stringify({ event: "extension_rpc_failed", request_id: requestId, operation: name, sql_state: error.code, code: mapped.code })); return response(mapped.status, { ok: false, code: mapped.code, message: mapped.message }, requestId); }
  return response(200, { ok: true, data }, requestId);
});
