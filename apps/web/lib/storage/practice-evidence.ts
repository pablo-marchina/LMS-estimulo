import "server-only";
import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const PRACTICE_EVIDENCE_MAX_BYTES = 6 * 1024 * 1024;
export const PRACTICE_EVIDENCE_MIME_TYPES = [
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
  try {
    await ensurePrivateBucket({
      bucket: input.bucket,
      maxBytes: PRACTICE_EVIDENCE_MAX_BYTES,
      allowedMimeTypes: PRACTICE_EVIDENCE_MIME_TYPES,
    });
  } catch (error) {
    throw new Error(`PRACTICE_BUCKET_CREATE_FAILED:${detail(error)}`);
  }

  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`PRACTICE_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removePracticeEvidence(bucket: string, objectKey: string): Promise<void> {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`PRACTICE_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createPracticeEvidenceDownloadUrl(input: {
  bucket: string;
  objectKey: string;
  filename: string;
}): Promise<string> {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: 60 });
  } catch (error) {
    throw new Error(`PRACTICE_SIGNED_URL_FAILED:${detail(error)}`);
  }
}
