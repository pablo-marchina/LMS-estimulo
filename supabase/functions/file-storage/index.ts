import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STORAGE_BUCKET = Deno.env.get("FILE_STORAGE_BUCKET") ?? "estimulo-private-test";
const DOWNLOAD_TTL_SECONDS = 60;

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-request-id",
  "access-control-allow-methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

function normalizeContentType(value: unknown) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function bearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new Error("authorization_required");
  return match[1];
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function fingerprint(value: unknown) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))));
}

function one<T>(data: T[] | T | null, operation: string): T {
  if (Array.isArray(data)) {
    if (data.length !== 1) throw new Error(`${operation}_expected_one_row`);
    return data[0];
  }
  if (!data) throw new Error(`${operation}_missing_data`);
  return data;
}

async function identityFromRequest(req: Request, admin: SupabaseClient) {
  const token = bearerToken(req);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("invalid_access_token");
  const user = data.user;
  const email = user.email?.trim().toLowerCase() ?? null;
  if (!email || !user.email_confirmed_at) throw new Error("verified_email_required");
  return {
    provider: "supabase",
    issuer: `${PROJECT_URL.replace(/\/$/, "")}/auth/v1`,
    subject: user.id,
    email,
    emailVerified: true,
    claimsFingerprint: await fingerprint({
      id: user.id,
      email,
      role: user.role ?? null,
      isAnonymous: user.is_anonymous ?? false,
      appMetadata: user.app_metadata ?? {},
    }),
  };
}

async function inspectAndHash(admin: SupabaseClient, descriptor: {
  bucket: string;
  object_key: string;
  expected_content_type: string;
  max_size_bytes: number;
}) {
  const bucket = admin.storage.from(descriptor.bucket);
  const infoResult = await bucket.info(descriptor.object_key);
  if (infoResult.error || !infoResult.data) throw new Error(`object_info_failed:${errorText(infoResult.error)}`);
  const info = infoResult.data;
  const sizeBytes = Number(info.size ?? info.metadata?.size ?? 0);
  const contentType = normalizeContentType(
    info.contentType ?? info.metadata?.mimetype ?? info.metadata?.contentType,
  );
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error("invalid_provider_size");
  if (sizeBytes > Number(descriptor.max_size_bytes)) throw new Error("file_too_large");
  if (contentType !== normalizeContentType(descriptor.expected_content_type)) throw new Error("content_type_mismatch");

  const downloadResult = await bucket.download(descriptor.object_key);
  if (downloadResult.error || !downloadResult.data) throw new Error(`object_download_failed:${errorText(downloadResult.error)}`);
  const bytes = await downloadResult.data.arrayBuffer();
  if (bytes.byteLength !== sizeBytes) throw new Error("provider_size_mismatch");
  return {
    contentType,
    sizeBytes,
    sha256: hex(await crypto.subtle.digest("SHA-256", bytes)),
    providerObjectVersion: info.version ?? null,
    etag: info.eTag ?? null,
    metadata: info.metadata ?? {},
  };
}

async function createUploadIntent(req: Request, admin: SupabaseClient) {
  const identity = await identityFromRequest(req, admin);
  const body = await req.json();
  const { data, error } = await admin.rpc("file_create_upload_intent", {
    p_provider: identity.provider,
    p_issuer: identity.issuer,
    p_subject: identity.subject,
    p_email_normalized: identity.email,
    p_email_verified: identity.emailVerified,
    p_claims_fingerprint: identity.claimsFingerprint,
    p_owner_organization_id: body.ownerOrganizationId,
    p_requested_by_entrepreneur_id: body.entrepreneurId ?? null,
    p_upload_profile_code: body.uploadProfileCode,
    p_storage_provider: "supabase_storage",
    p_bucket: STORAGE_BUCKET,
    p_original_filename: body.fileName,
    p_expected_content_type: normalizeContentType(body.contentType),
    p_ttl_seconds: body.ttlSeconds ?? 900,
  });
  if (error) throw new Error(`create_upload_intent_failed:${errorText(error)}`);
  const intent = one(data, "create_upload_intent");
  const signed = await admin.storage.from(intent.bucket).createSignedUploadUrl(intent.object_key, { upsert: false });
  if (signed.error || !signed.data) {
    await admin.rpc("file_abort_upload_intent", { p_intent_id: intent.intent_id, p_failure_code: "signed_url_failed" });
    throw new Error(`create_signed_upload_failed:${errorText(signed.error)}`);
  }
  return response({
    intentId: intent.intent_id,
    objectKey: intent.object_key,
    uploadUrl: signed.data.signedUrl,
    uploadToken: signed.data.token,
    requiredHeaders: { "content-type": intent.expected_content_type },
    maxBytes: Number(intent.max_size_bytes),
    applicationExpiresAt: intent.expires_at,
    providerExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    immutableKey: true,
  }, 201);
}

async function confirmUpload(req: Request, admin: SupabaseClient, intentId: string) {
  const identity = await identityFromRequest(req, admin);
  const descriptorResult = await admin.rpc("file_get_upload_intent", {
    p_provider: identity.provider,
    p_issuer: identity.issuer,
    p_subject: identity.subject,
    p_email_normalized: identity.email,
    p_email_verified: identity.emailVerified,
    p_claims_fingerprint: identity.claimsFingerprint,
    p_intent_id: intentId,
  });
  if (descriptorResult.error) throw new Error(`get_upload_intent_failed:${errorText(descriptorResult.error)}`);
  const descriptor = one(descriptorResult.data, "get_upload_intent");
  if (descriptor.status !== "pending_upload") throw new Error("upload_intent_not_pending");
  if (Date.parse(descriptor.expires_at) <= Date.now()) throw new Error("upload_intent_expired");

  const inspected = await inspectAndHash(admin, descriptor);
  const confirmed = await admin.rpc("file_confirm_upload", {
    p_provider: identity.provider,
    p_issuer: identity.issuer,
    p_subject: identity.subject,
    p_email_normalized: identity.email,
    p_email_verified: identity.emailVerified,
    p_claims_fingerprint: identity.claimsFingerprint,
    p_intent_id: intentId,
    p_actual_content_type: inspected.contentType,
    p_actual_size_bytes: inspected.sizeBytes,
    p_sha256: inspected.sha256,
    p_provider_object_version: inspected.providerObjectVersion,
    p_etag: inspected.etag,
    p_metadata: inspected.metadata,
  });
  if (confirmed.error) throw new Error(`confirm_upload_failed:${errorText(confirmed.error)}`);
  const file = one(confirmed.data, "confirm_upload");
  return response({
    fileObjectId: file.file_object_id,
    securityStatus: file.security_status,
    sha256: file.sha256,
    sizeBytes: Number(file.size_bytes),
    quarantined: true,
  });
}

async function createDownloadIntent(req: Request, admin: SupabaseClient, fileObjectId: string) {
  const identity = await identityFromRequest(req, admin);
  const descriptorResult = await admin.rpc("file_get_download_descriptor", {
    p_provider: identity.provider,
    p_issuer: identity.issuer,
    p_subject: identity.subject,
    p_email_normalized: identity.email,
    p_email_verified: identity.emailVerified,
    p_claims_fingerprint: identity.claimsFingerprint,
    p_file_object_id: fileObjectId,
  });
  if (descriptorResult.error) throw new Error(`get_download_descriptor_failed:${errorText(descriptorResult.error)}`);
  const descriptor = one(descriptorResult.data, "get_download_descriptor");
  const signed = await admin.storage.from(descriptor.bucket).createSignedUrl(
    descriptor.object_key,
    DOWNLOAD_TTL_SECONDS,
    { download: true },
  );
  if (signed.error || !signed.data) throw new Error(`create_signed_download_failed:${errorText(signed.error)}`);
  return response({
    fileObjectId,
    downloadUrl: signed.data.signedUrl,
    expiresAt: new Date(Date.now() + DOWNLOAD_TTL_SECONDS * 1000).toISOString(),
    contentType: descriptor.content_type,
    sizeBytes: Number(descriptor.size_bytes),
    sha256: descriptor.sha256,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  if (!PROJECT_URL || !SERVICE_ROLE_KEY) return response({ error: "storage_service_not_configured" }, 500);

  const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const path = new URL(req.url).pathname.replace(/^\/file-storage\/?/, "/");

  try {
    if (path === "/upload-intents") return await createUploadIntent(req, admin);
    const confirm = /^\/upload-intents\/([0-9a-f-]+)\/confirm$/.exec(path);
    if (confirm) return await confirmUpload(req, admin, confirm[1]);
    const download = /^\/files\/([0-9a-f-]+)\/download-intents$/.exec(path);
    if (download) return await createDownloadIntent(req, admin, download[1]);
    return response({ error: "route_not_found" }, 404);
  } catch (error) {
    const message = errorText(error);
    const status = message.includes("not_authorized") || message.includes("invalid_access_token") || message.includes("authorization_required") ? 401
      : message.includes("not_found") ? 404
      : message.includes("not_pending") || message.includes("expired") ? 409
      : message.includes("required") || message.includes("invalid") || message.includes("mismatch") || message.includes("too_large") ? 400
      : 500;
    return response({ error: message }, status);
  }
});
