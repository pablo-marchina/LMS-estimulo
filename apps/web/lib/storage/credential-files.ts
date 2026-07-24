import "server-only";
import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { browserE2EEnabled, browserE2EStorageDir } from "@/lib/browser-e2e/config";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const EXTERNAL_CREDENTIAL_MAX_BYTES = 8 * 1024 * 1024;
export const CERTIFICATE_TEMPLATE_MAX_BYTES = 10 * 1024 * 1024;

const EXTERNAL_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
const TEMPLATE_TYPES = ["image/jpeg"] as const;
const EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export function externalCredentialBucket() {
  return process.env.CREDENTIAL_FILES_BUCKET?.trim() || "credential-files";
}

export function certificateTemplateBucket() {
  return process.env.CERTIFICATE_TEMPLATE_BUCKET?.trim() || "certificate-templates";
}

function validate(file: File, kind: "external" | "template") {
  const contentType = file.type.trim().toLowerCase();
  const allowed = kind === "external" ? EXTERNAL_TYPES : TEMPLATE_TYPES;
  const max = kind === "external" ? EXTERNAL_CREDENTIAL_MAX_BYTES : CERTIFICATE_TEMPLATE_MAX_BYTES;
  if (!allowed.includes(contentType as never)) throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_TYPE_NOT_ALLOWED" : "CERTIFICATE_TEMPLATE_TYPE_NOT_ALLOWED");
  if (file.size < 1 || file.size > max) throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_SIZE_INVALID" : "CERTIFICATE_TEMPLATE_SIZE_INVALID");
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!EXTENSIONS[contentType]?.includes(extension)) throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_EXTENSION_NOT_ALLOWED" : "CERTIFICATE_TEMPLATE_EXTENSION_NOT_ALLOWED");
}

export const validateExternalCredentialFile = (file: File) => validate(file, "external");
export const validateCertificateTemplateFile = (file: File) => validate(file, "template");

function localObjectPath(bucket: string, objectKey: string) {
  const safeBucket = bucket.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeSegments = objectKey.split("/").filter(Boolean).map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"));
  return join(browserE2EStorageDir(), safeBucket, ...safeSegments);
}

async function ensurePrivateBucket(bucket: string, limit: number, mimeTypes: readonly string[]) {
  if (browserE2EEnabled()) {
    await mkdir(join(browserE2EStorageDir(), bucket.replace(/[^a-zA-Z0-9._-]/g, "_")), { recursive: true });
    return;
  }
  const client = createPrivilegedClient();
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;
  const { error } = await client.storage.createBucket(bucket, { public: false, fileSizeLimit: limit, allowedMimeTypes: [...mimeTypes] });
  if (error && !/already exists/i.test(error.message)) throw new Error(`CREDENTIAL_BUCKET_CREATE_FAILED:${error.message}`);
}

export async function uploadCredentialFile(input: { bucket: string; objectKey: string; file: File; kind: "external" | "template" }) {
  validate(input.file, input.kind);
  const max = input.kind === "external" ? EXTERNAL_CREDENTIAL_MAX_BYTES : CERTIFICATE_TEMPLATE_MAX_BYTES;
  const types = input.kind === "external" ? EXTERNAL_TYPES : TEMPLATE_TYPES;
  await ensurePrivateBucket(input.bucket, max, types);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (browserE2EEnabled()) {
    const destination = localObjectPath(input.bucket, input.objectKey);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    return { sha256, etag: sha256, providerObjectVersion: "synthetic-e2e", created: true };
  }
  const client = createPrivilegedClient();
  const { error } = await client.storage.from(input.bucket).upload(input.objectKey, bytes, { contentType: input.file.type, cacheControl: "3600", upsert: false });
  if (error && !/already exists|asset already exists/i.test(error.message)) throw new Error(`CREDENTIAL_STORAGE_UPLOAD_FAILED:${error.message}`);
  return { sha256, etag: null, providerObjectVersion: null, created: !error };
}

export async function removeCredentialFile(bucket: string, objectKey: string) {
  if (browserE2EEnabled()) {
    await unlink(localObjectPath(bucket, objectKey)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    return;
  }
  const { error } = await createPrivilegedClient().storage.from(bucket).remove([objectKey]);
  if (error) throw new Error(`CREDENTIAL_STORAGE_REMOVE_FAILED:${error.message}`);
}

export async function createCredentialDownloadUrl(input: { bucket: string; objectKey: string; filename: string }) {
  if (browserE2EEnabled()) throw new Error("CREDENTIAL_DOWNLOAD_NOT_AVAILABLE_IN_BROWSER_E2E");
  const { data, error } = await createPrivilegedClient().storage.from(input.bucket).createSignedUrl(input.objectKey, 60, { download: input.filename });
  if (error || !data?.signedUrl) throw new Error(`CREDENTIAL_SIGNED_URL_FAILED:${error?.message ?? "missing_url"}`);
  return data.signedUrl;
}

export async function downloadCredentialObject(bucket: string, objectKey: string): Promise<Buffer> {
  if (browserE2EEnabled()) throw new Error("CREDENTIAL_OBJECT_NOT_AVAILABLE_IN_BROWSER_E2E");
  const { data, error } = await createPrivilegedClient().storage.from(bucket).download(objectKey);
  if (error || !data) throw new Error(`CREDENTIAL_OBJECT_DOWNLOAD_FAILED:${error?.message ?? "missing_data"}`);
  return Buffer.from(await data.arrayBuffer());
}
