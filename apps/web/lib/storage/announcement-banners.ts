import "server-only";
import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { browserE2EEnabled, browserE2EStorageDir } from "@/lib/browser-e2e/config";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const ANNOUNCEMENT_BANNER_MAX_BYTES = 4 * 1024 * 1024;
export const ANNOUNCEMENT_BANNER_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export function announcementBannerBucket(): string {
  return process.env.ANNOUNCEMENT_BANNER_BUCKET?.trim() || "announcement-banners";
}

export function validateAnnouncementBanner(file: File): void {
  const contentType = file.type.trim().toLowerCase();
  if (!ANNOUNCEMENT_BANNER_MIME_TYPES.includes(contentType as (typeof ANNOUNCEMENT_BANNER_MIME_TYPES)[number])) {
    throw new Error("ANNOUNCEMENT_CONTENT_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > ANNOUNCEMENT_BANNER_MAX_BYTES) {
    throw new Error("ANNOUNCEMENT_FILE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error("ANNOUNCEMENT_FILE_EXTENSION_NOT_ALLOWED");
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
    fileSizeLimit: ANNOUNCEMENT_BANNER_MAX_BYTES,
    allowedMimeTypes: [...ANNOUNCEMENT_BANNER_MIME_TYPES],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`ANNOUNCEMENT_BUCKET_CREATE_FAILED:${error.message}`);
  }
}

export async function uploadAnnouncementBanner(input: {
  bucket: string;
  objectKey: string;
  file: File;
}): Promise<{ sha256: string; etag: string | null; providerObjectVersion: string | null; created: boolean }> {
  validateAnnouncementBanner(input.file);
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
    upsert: false,
  });
  if (error && !/already exists|asset already exists/i.test(error.message)) {
    throw new Error(`ANNOUNCEMENT_STORAGE_UPLOAD_FAILED:${error.message}`);
  }
  return { sha256, etag: null, providerObjectVersion: null, created: !error };
}

export async function removeAnnouncementBanner(bucket: string, objectKey: string): Promise<void> {
  if (browserE2EEnabled()) {
    await unlink(localObjectPath(bucket, objectKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  const client = createPrivilegedClient();
  const { error } = await client.storage.from(bucket).remove([objectKey]);
  if (error) throw new Error(`ANNOUNCEMENT_STORAGE_REMOVE_FAILED:${error.message}`);
}

export async function createAnnouncementBannerUrl(input: { bucket: string; objectKey: string }): Promise<string> {
  if (browserE2EEnabled()) throw new Error("ANNOUNCEMENT_IMAGE_NOT_RELEASED_IN_BROWSER_E2E");
  const client = createPrivilegedClient();
  const { data, error } = await client.storage.from(input.bucket).createSignedUrl(input.objectKey, 300);
  if (error || !data?.signedUrl) {
    throw new Error(`ANNOUNCEMENT_SIGNED_URL_FAILED:${error?.message ?? "missing_url"}`);
  }
  return data.signedUrl;
}
