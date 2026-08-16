import "server-only";
import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const REWARD_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const REWARD_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const REWARD_IMAGE_SIGNED_URL_SECONDS = 900;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

function detail(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

export function rewardImageBucket(): string {
  return process.env.REWARD_IMAGE_BUCKET?.trim() || "reward-images";
}

export function validateRewardImage(file: File): void {
  const contentType = file.type.trim().toLowerCase();
  if (!REWARD_IMAGE_MIME_TYPES.includes(contentType as (typeof REWARD_IMAGE_MIME_TYPES)[number])) {
    throw new Error("REWARD_IMAGE_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > REWARD_IMAGE_MAX_BYTES) {
    throw new Error("REWARD_IMAGE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error("REWARD_IMAGE_EXTENSION_NOT_ALLOWED");
  }
}

export async function uploadRewardImage(input: {
  bucket: string;
  objectKey: string;
  file: File;
}): Promise<{ sha256: string; etag: string | null; providerObjectVersion: string | null; created: boolean }> {
  validateRewardImage(input.file);
  try {
    await ensurePrivateBucket({
      bucket: input.bucket,
      maxBytes: REWARD_IMAGE_MAX_BYTES,
      allowedMimeTypes: REWARD_IMAGE_MIME_TYPES,
    });
  } catch (error) {
    throw new Error(`REWARD_IMAGE_BUCKET_CREATE_FAILED:${detail(error)}`);
  }
  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`REWARD_IMAGE_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removeRewardImage(bucket: string, objectKey: string): Promise<void> {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`REWARD_IMAGE_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createRewardImageUrl(input: { bucket: string; objectKey: string }): Promise<string> {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: REWARD_IMAGE_SIGNED_URL_SECONDS });
  } catch (error) {
    throw new Error(`REWARD_IMAGE_SIGNED_URL_FAILED:${detail(error)}`);
  }
}
