import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const currentIdentityOperation = "e14_resolve_current_identity";
const allowedRpcs = new Set([
  "abort_announcement_banner_upload",
  "abort_external_credential_upload",
  "abort_library_upload",
  "abort_practice_upload",
  "confirm_announcement_banner_upload",
  "confirm_certificate_template_upload",
  "confirm_external_credential_upload",
  "confirm_library_upload",
  "confirm_practice_upload",
  "configure_certificate_version",
  "create_activity_comment",
  "create_announcement_banner_upload_intent",
  "create_certificate_template_upload_intent",
  "create_external_credential_upload_intent",
  "create_library_upload_intent",
  "create_practice_upload_intent",
  "e14_acknowledge_section",
  "e14_complete_diagnostic",
  "e14_create_enrollment",
  "e14_get_operator_result",
  "e14_get_operator_workspace",
  "e14_get_participant_experience",
  "e14_get_participant_state",
  "e14_list_eligible_journeys",
  "e14_list_operator_instances",
  "e14_list_participant_journeys",
  "e14_publish_vertical",
  "e14_record_diagnostic_response",
  "e14_record_quick_check_answer",
  "e14_self_enroll",
  "e14_start_activity",
  "e14_start_diagnostic",
  "e14_start_journey",
  "e14_start_quick_check",
  "e14_submit_quick_check",
  "ensure_participant_default_path",
  "focus_participant_activity",
  "get_activity_asset_download",
  "get_activity_utility_rating",
  "get_admin_product_workspace",
  "get_admin_reporting_dashboard",
  "get_announcement_banner_download",
  "get_business_maturity_draft",
  "get_certificate_render_payload",
  "get_external_credential_download",
  "get_library_content",
  "get_library_file_download",
  "get_participant_diagnostic_summary",
  "get_participant_engagement_hub",
  "get_participant_experience_with_default_diagnostic",
  "get_participant_journey_outline",
  "get_practice_download_descriptor",
  "grant_organization_role",
  "issue_learning_credentials",
  "list_activity_comments",
  "list_admin_identity_resolution_cases",
  "list_library_content",
  "list_operator_activity_comments",
  "list_operator_announcements",
  "list_operator_library_content",
  "list_operator_practice_submissions",
  "list_organization_role_management",
  "list_participant_credentials",
  "list_participant_external_credentials",
  "list_participant_point_rules",
  "list_practice_submissions",
  "moderate_activity_comment",
  "persist_configurable_product_result",
  "publish_admin_journey_version",
  "publish_certificate_version",
  "publish_library_content",
  "rate_activity_utility",
  "record_activity_asset_progress",
  "record_library_content_access",
  "resolve_admin_identity_resolution_case",
  "retire_admin_diagnostic",
  "review_practice_submission",
  "revoke_organization_role",
  "save_admin_product_resource",
  "save_library_content_draft",
  "save_operator_announcement",
  "set_participant_application_objective",
]);

const legacyActorArgument = new Set([
  "e14_acknowledge_section",
  "e14_complete_diagnostic",
  "e14_get_operator_result",
  "e14_get_participant_state",
  "e14_record_quick_check_answer",
  "e14_start_activity",
  "e14_start_quick_check",
  "e14_submit_quick_check",
]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

async function fingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST required" });
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return json(401, { ok: false, code: "AUTHENTICATED_SESSION_REQUIRED", message: "Missing bearer token" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(500, { ok: false, code: "RUNTIME_CONFIGURATION_INVALID", message: "Supabase runtime secrets are unavailable" });

  let payload: { name?: unknown; args?: unknown };
  try { payload = await request.json(); } catch { return json(400, { ok: false, code: "INVALID_JSON", message: "JSON body required" }); }
  const name = typeof payload.name === "string" ? payload.name : "";
  const args = payload.args && typeof payload.args === "object" && !Array.isArray(payload.args) ? payload.args as Record<string, unknown> : null;
  if ((!allowedRpcs.has(name) && name !== currentIdentityOperation) || !args) return json(400, { ok: false, code: "RPC_NOT_ALLOWED", message: "RPC is not allowlisted" });

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase() ?? "";
  const provider = typeof user?.app_metadata?.provider === "string" ? user.app_metadata.provider : "";
  if (userError || !user?.email_confirmed_at || !email || !["email", "google"].includes(provider)) return json(401, { ok: false, code: "VERIFIED_SESSION_REQUIRED", message: "Session could not be verified" });

  const issuer = `${supabaseUrl.replace(/\/$/, "")}/auth/v1`;
  const claimsFingerprint = await fingerprint({ issuer, subject: user.id, email, provider, audience: user.aud, appMetadata: user.app_metadata });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: identity, error: identityError } = await admin.rpc("e14_resolve_identity", { p_provider: provider, p_issuer: issuer, p_subject: user.id, p_email_normalized: email, p_email_verified: true, p_claims_fingerprint: claimsFingerprint });
  if (identityError || !identity?.user_account_id) return json(403, { ok: false, code: identityError?.code ?? "IDENTITY_RESOLUTION_FAILED", message: identityError?.message ?? "Internal identity unavailable" });
  if (name === currentIdentityOperation) return json(200, { ok: true, data: identity });

  const actorArgument = legacyActorArgument.has(name) ? "a" : "p_actor_user_account_id";
  if (args[actorArgument] !== identity.user_account_id) return json(403, { ok: false, code: "ACTOR_MISMATCH", message: "RPC actor does not match the authenticated identity" });
  const { data, error } = await admin.rpc(name, args);
  if (error) return json(400, { ok: false, code: error.code ?? "RPC_ERROR", message: error.message });
  return json(200, { ok: true, data });
});