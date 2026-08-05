import "server-only";
import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const INTERFACE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const INTERFACE_MEDIA_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

function detail(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}

export function interfaceMediaBucket() {
  return process.env.INTERFACE_MEDIA_BUCKET?.trim() || "interface-media";
}

export function validateInterfaceMedia(file: File) {
  const contentType = file.type.trim().toLowerCase();
  if (!INTERFACE_MEDIA_MIME_TYPES.includes(contentType as (typeof INTERFACE_MEDIA_MIME_TYPES)[number])) {
    throw new Error("INTERFACE_MEDIA_CONTENT_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > INTERFACE_MEDIA_MAX_BYTES) {
    throw new Error("INTERFACE_MEDIA_FILE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error("INTERFACE_MEDIA_EXTENSION_NOT_ALLOWED");
  }
}

export async function uploadInterfaceMedia(input: { bucket: string; objectKey: string; file: File }) {
  validateInterfaceMedia(input.file);
  try {
    await ensurePrivateBucket({
      bucket: input.bucket,
      maxBytes: INTERFACE_MEDIA_MAX_BYTES,
      allowedMimeTypes: INTERFACE_MEDIA_MIME_TYPES,
    });
  } catch (error) {
    throw new Error(`INTERFACE_MEDIA_BUCKET_CREATE_FAILED:${detail(error)}`);
  }
  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`INTERFACE_MEDIA_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removeInterfaceMedia(bucket: string, objectKey: string) {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`INTERFACE_MEDIA_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createInterfaceMediaUrl(input: { bucket: string; objectKey: string }) {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: 300 });
  } catch (error) {
    throw new Error(`INTERFACE_MEDIA_SIGNED_URL_FAILED:${detail(error)}`);
  }
}
