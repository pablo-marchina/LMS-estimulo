import "server-only";
import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const LIBRARY_CONTENT_MAX_BYTES = 6 * 1024 * 1024;
export const LIBRARY_CONTENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "text/plain": ["txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
};

function detail(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

export function libraryContentBucket(): string {
  return process.env.LIBRARY_CONTENT_BUCKET?.trim() || "library-content";
}

export function validateLibraryContentFile(file: File): void {
  const contentType = file.type.trim().toLowerCase();
  if (!LIBRARY_CONTENT_MIME_TYPES.includes(contentType as (typeof LIBRARY_CONTENT_MIME_TYPES)[number])) {
    throw new Error("LIBRARY_CONTENT_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > LIBRARY_CONTENT_MAX_BYTES) {
    throw new Error("LIBRARY_FILE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error("LIBRARY_FILE_EXTENSION_NOT_ALLOWED");
  }
}

export async function uploadLibraryContent(input: {
  bucket: string;
  objectKey: string;
  file: File;
}): Promise<{ sha256: string; etag: string | null; providerObjectVersion: string | null; created: boolean }> {
  validateLibraryContentFile(input.file);
  try {
    await ensurePrivateBucket({
      bucket: input.bucket,
      maxBytes: LIBRARY_CONTENT_MAX_BYTES,
      allowedMimeTypes: LIBRARY_CONTENT_MIME_TYPES,
    });
  } catch (error) {
    throw new Error(`LIBRARY_BUCKET_CREATE_FAILED:${detail(error)}`);
  }

  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`LIBRARY_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removeLibraryContent(bucket: string, objectKey: string): Promise<void> {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`LIBRARY_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createLibraryContentDownloadUrl(input: {
  bucket: string;
  objectKey: string;
  filename: string;
}): Promise<string> {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: 60 });
  } catch (error) {
    throw new Error(`LIBRARY_SIGNED_URL_FAILED:${detail(error)}`);
  }
}
