import "server-only";
import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const ANNOUNCEMENT_BANNER_MAX_BYTES = 4 * 1024 * 1024;
export const ANNOUNCEMENT_BANNER_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ANNOUNCEMENT_BANNER_SIGNED_URL_SECONDS = 900;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

function detail(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

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

export async function uploadAnnouncementBanner(input: {
  bucket: string;
  objectKey: string;
  file: File;
}): Promise<{ sha256: string; etag: string | null; providerObjectVersion: string | null; created: boolean }> {
  validateAnnouncementBanner(input.file);
  try {
    await ensurePrivateBucket({
      bucket: input.bucket,
      maxBytes: ANNOUNCEMENT_BANNER_MAX_BYTES,
      allowedMimeTypes: ANNOUNCEMENT_BANNER_MIME_TYPES,
    });
  } catch (error) {
    throw new Error(`ANNOUNCEMENT_BUCKET_CREATE_FAILED:${detail(error)}`);
  }

  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`ANNOUNCEMENT_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removeAnnouncementBanner(bucket: string, objectKey: string): Promise<void> {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`ANNOUNCEMENT_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createAnnouncementBannerUrl(input: { bucket: string; objectKey: string }): Promise<string> {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: ANNOUNCEMENT_BANNER_SIGNED_URL_SECONDS });
  } catch (error) {
    throw new Error(`ANNOUNCEMENT_SIGNED_URL_FAILED:${detail(error)}`);
  }
}
