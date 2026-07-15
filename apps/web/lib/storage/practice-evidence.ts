import "server-only";
import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { browserE2EEnabled, browserE2EStorageDir } from "@/lib/browser-e2e/config";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const PRACTICE_EVIDENCE_MAX_BYTES = 6 * 1024 * 1024;
export const PRACTICE_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "text/plain": ["txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"]
};

export function practiceEvidenceBucket(): string {
  return process.env.PRACTICE_EVIDENCE_BUCKET?.trim() || "practice-evidence";
}

export function validatePracticeEvidenceFile(file: File): void {
  const contentType = file.type.trim().toLowerCase();
  if (!PRACTICE_EVIDENCE_MIME_TYPES.includes(contentType as (typeof PRACTICE_EVIDENCE_MIME_TYPES)[number])) {
    throw new Error("PRACTICE_CONTENT_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > PRACTICE_EVIDENCE_MAX_BYTES) {
    throw new Error("PRACTICE_FILE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error("PRACTICE_FILE_EXTENSION_NOT_ALLOWED");
  }
}

function localObjectPath(bucket: string, objectKey: string): string {
  const safeBucket = bucket.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeSegments = objectKey.split("/").filter(Boolean).map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_"));
  return join(browserE2EStorageDir(), safeBucket, ...safeSegments);
}

async function ensurePrivateBucket(bucket: string): Promise<void> {
  if (browserE2EEnabled()) {
    await mkdir(join(browserE2EStorageDir(), bucket.replace(/[^a-zA-Z0-9._-]/g, "_")), { recursive: true });
    return;
  }

  const client = createPrivilegedClient();
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;

  const { error } = await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: PRACTICE_EVIDENCE_MAX_BYTES,
    allowedMimeTypes: [...PRACTICE_EVIDENCE_MIME_TYPES]
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`PRACTICE_BUCKET_CREATE_FAILED:${error.message}`);
  }
}

export async function uploadPracticeEvidence(input: {
  bucket: string;
  objectKey: string;
  file: File;
}): Promise<{
  sha256: string;
  etag: string | null;
  providerObjectVersion: string | null;
  created: boolean;
}> {
  validatePracticeEvidenceFile(input.file);
  await ensurePrivateBucket(input.bucket);

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  if (browserE2EEnabled()) {
    const destination = localObjectPath(input.bucket, input.objectKey);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
    return { sha256, etag: sha256, providerObjectVersion: "synthetic-e2e", created: true };
  }

  const client = createPrivilegedClient();
  const { error } = await client.storage.from(input.bucket).upload(input.objectKey, bytes, {
    contentType: input.file.type,
    cacheControl: "3600",
    upsert: false
  });
  if (error && !/already exists|asset already exists/i.test(error.message)) {
    throw new Error(`PRACTICE_STORAGE_UPLOAD_FAILED:${error.message}`);
  }

  return { sha256, etag: null, providerObjectVersion: null, created: !error };
}

export async function removePracticeEvidence(bucket: string, objectKey: string): Promise<void> {
  if (browserE2EEnabled()) {
    await unlink(localObjectPath(bucket, objectKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }

  const client = createPrivilegedClient();
  const { error } = await client.storage.from(bucket).remove([objectKey]);
  if (error) throw new Error(`PRACTICE_STORAGE_REMOVE_FAILED:${error.message}`);
}

export async function createPracticeEvidenceDownloadUrl(input: {
  bucket: string;
  objectKey: string;
  filename: string;
}): Promise<string> {
  if (browserE2EEnabled()) throw new Error("PRACTICE_DOWNLOAD_NOT_RELEASED_IN_BROWSER_E2E");

  const client = createPrivilegedClient();
  const { data, error } = await client.storage.from(input.bucket).createSignedUrl(input.objectKey, 60, {
    download: input.filename
  });
  if (error || !data?.signedUrl) {
    throw new Error(`PRACTICE_SIGNED_URL_FAILED:${error?.message ?? "missing_url"}`);
  }
  return data.signedUrl;
}
