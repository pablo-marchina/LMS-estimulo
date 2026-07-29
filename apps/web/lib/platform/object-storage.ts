import "server-only";
import { createHash } from "node:crypto";
import { platformRuntimeProvider } from "@/lib/platform/runtime-provider";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export type StoredObjectReceipt = {
  sha256: string;
  etag: string | null;
  providerObjectVersion: string | null;
  created: boolean;
};

export type PrivateBucketPolicy = {
  bucket: string;
  maxBytes: number;
  allowedMimeTypes: readonly string[];
};

export type DirectUploadRequest = {
  bucket: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  expiresInSeconds: number;
  metadata?: Record<string, string>;
};

export type DirectUploadGrant = {
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
  objectKey: string;
  checksumAlgorithm: "SHA256";
};

export type ObjectInspectionRequest = {
  bucket: string;
  objectKey: string;
  expectedContentType: string;
  expectedSizeBytes: number;
  expectedSha256: string;
};

export type InspectedObject = {
  contentType: string;
  sizeBytes: number;
  sha256: string;
  etag: string | null;
  providerObjectVersion: string | null;
};

const sha256Pattern = /^[a-f0-9]{64}$/;

function assertObjectReference(bucket: string, objectKey: string): void {
  if (!bucket.trim()) throw new Error("STORAGE_BUCKET_REQUIRED");
  if (!objectKey.trim() || objectKey.startsWith("/") || objectKey.includes("..") || objectKey.length > 1024) {
    throw new Error("STORAGE_OBJECT_KEY_INVALID");
  }
}

export function assertDirectUploadRequest(input: DirectUploadRequest): void {
  assertObjectReference(input.bucket, input.objectKey);
  if (!input.contentType.trim()) throw new Error("DIRECT_UPLOAD_CONTENT_TYPE_REQUIRED");
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes < 1) {
    throw new Error("DIRECT_UPLOAD_SIZE_INVALID");
  }
  if (!sha256Pattern.test(input.sha256)) throw new Error("DIRECT_UPLOAD_SHA256_INVALID");
  if (!Number.isInteger(input.expiresInSeconds) || input.expiresInSeconds < 30 || input.expiresInSeconds > 900) {
    throw new Error("DIRECT_UPLOAD_EXPIRATION_INVALID");
  }
  for (const [name, value] of Object.entries(input.metadata ?? {})) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/u.test(name) || value.length > 1024) {
      throw new Error("DIRECT_UPLOAD_METADATA_INVALID");
    }
  }
}

export function assertObjectInspectionRequest(input: ObjectInspectionRequest): void {
  assertObjectReference(input.bucket, input.objectKey);
  if (!input.expectedContentType.trim()) throw new Error("OBJECT_INSPECTION_CONTENT_TYPE_REQUIRED");
  if (!Number.isSafeInteger(input.expectedSizeBytes) || input.expectedSizeBytes < 1) {
    throw new Error("OBJECT_INSPECTION_SIZE_INVALID");
  }
  if (!sha256Pattern.test(input.expectedSha256)) throw new Error("OBJECT_INSPECTION_SHA256_INVALID");
}

export async function ensurePrivateBucket(policy: PrivateBucketPolicy): Promise<void> {
  if (platformRuntimeProvider() === "aws") {
    throw new Error("AWS_BUCKETS_MUST_BE_PROVISIONED_BY_INFRASTRUCTURE");
  }

  const client = createPrivilegedClient();
  const { data } = await client.storage.getBucket(policy.bucket);
  if (data) return;

  const { error } = await client.storage.createBucket(policy.bucket, {
    public: false,
    fileSizeLimit: policy.maxBytes,
    allowedMimeTypes: [...policy.allowedMimeTypes],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`SUPABASE_BUCKET_CREATE_FAILED:${error.message}`);
  }
}

export async function uploadBufferedPrivateObject(input: {
  bucket: string;
  objectKey: string;
  file: File;
  cacheControl?: string;
}): Promise<StoredObjectReceipt> {
  if (platformRuntimeProvider() === "aws") {
    throw new Error("AWS_DIRECT_UPLOAD_REQUIRED");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const client = createPrivilegedClient();
  const { error } = await client.storage.from(input.bucket).upload(input.objectKey, bytes, {
    contentType: input.file.type,
    cacheControl: input.cacheControl ?? "3600",
    upsert: false,
  });
  if (error && !/already exists|asset already exists/i.test(error.message)) {
    throw new Error(`SUPABASE_STORAGE_UPLOAD_FAILED:${error.message}`);
  }
  return { sha256, etag: null, providerObjectVersion: null, created: !error };
}

export async function removePrivateObject(bucket: string, objectKey: string): Promise<void> {
  if (platformRuntimeProvider() === "aws") {
    throw new Error("AWS_STORAGE_ADAPTER_NOT_IMPLEMENTED");
  }

  const { error } = await createPrivilegedClient().storage.from(bucket).remove([objectKey]);
  if (error) throw new Error(`SUPABASE_STORAGE_REMOVE_FAILED:${error.message}`);
}

export async function createPrivateDownloadUrl(input: {
  bucket: string;
  objectKey: string;
  expiresInSeconds: number;
  filename?: string;
}): Promise<string> {
  if (platformRuntimeProvider() === "aws") {
    throw new Error("AWS_STORAGE_ADAPTER_NOT_IMPLEMENTED");
  }

  const options = input.filename ? { download: input.filename } : undefined;
  const { data, error } = await createPrivilegedClient()
    .storage
    .from(input.bucket)
    .createSignedUrl(input.objectKey, input.expiresInSeconds, options);
  if (error || !data?.signedUrl) {
    throw new Error(`SUPABASE_SIGNED_URL_FAILED:${error?.message ?? "missing_url"}`);
  }
  return data.signedUrl;
}

export async function downloadPrivateObject(bucket: string, objectKey: string): Promise<Buffer> {
  if (platformRuntimeProvider() === "aws") {
    throw new Error("AWS_STORAGE_ADAPTER_NOT_IMPLEMENTED");
  }

  const { data, error } = await createPrivilegedClient().storage.from(bucket).download(objectKey);
  if (error || !data) {
    throw new Error(`SUPABASE_STORAGE_DOWNLOAD_FAILED:${error?.message ?? "missing_data"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function createDirectUploadGrant(input: DirectUploadRequest): Promise<DirectUploadGrant> {
  assertDirectUploadRequest(input);
  if (platformRuntimeProvider() !== "aws") {
    throw new Error("DIRECT_UPLOAD_GRANT_REQUIRES_AWS_RUNTIME");
  }
  throw new Error("AWS_DIRECT_UPLOAD_ADAPTER_NOT_IMPLEMENTED");
}

export async function inspectDirectUploadObject(input: ObjectInspectionRequest): Promise<InspectedObject> {
  assertObjectInspectionRequest(input);
  if (platformRuntimeProvider() !== "aws") {
    throw new Error("DIRECT_UPLOAD_INSPECTION_REQUIRES_AWS_RUNTIME");
  }
  throw new Error("AWS_DIRECT_UPLOAD_ADAPTER_NOT_IMPLEMENTED");
}
