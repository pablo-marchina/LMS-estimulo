import "server-only";

import {
  createPrivateDownloadUrl,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

export const DELIVERY_EVIDENCE_MAX_BYTES = 25 * 1024 * 1024;
export const DELIVERY_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "text/plain", "text/markdown", "text/csv", "text/html", "text/css", "text/javascript",
  "application/json", "application/xml",
  "application/zip", "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
] as const;

const MIME_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"], "image/gif": ["gif"],
  "text/plain": ["txt", "py", "java", "c", "cpp", "h", "hpp", "go", "rs", "rb", "php", "swift", "kt", "sql", "sh"],
  "text/markdown": ["md", "markdown"], "text/csv": ["csv"], "text/html": ["html", "htm"], "text/css": ["css"],
  "text/javascript": ["js", "mjs", "cjs", "ts", "tsx", "jsx"], "application/json": ["json"], "application/xml": ["xml"],
  "application/zip": ["zip"], "application/x-zip-compressed": ["zip"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.oasis.opendocument.text": ["odt"], "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
  "audio/mpeg": ["mp3"], "audio/mp4": ["m4a", "mp4"], "audio/wav": ["wav"], "audio/ogg": ["ogg", "oga"], "audio/webm": ["weba", "webm"],
  "video/mp4": ["mp4", "m4v"], "video/webm": ["webm"], "video/quicktime": ["mov"],
};

function detail(error: unknown) { return error instanceof Error ? error.message : "unknown"; }

export function deliveryEvidenceBucket() { return process.env.DELIVERY_EVIDENCE_BUCKET?.trim() || "delivery-evidence"; }

export function validateDeliveryEvidenceFile(file: File) {
  const contentType = file.type.trim().toLowerCase();
  if (!DELIVERY_EVIDENCE_MIME_TYPES.includes(contentType as (typeof DELIVERY_EVIDENCE_MIME_TYPES)[number])) {
    throw new Error("DELIVERY_CONTENT_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > DELIVERY_EVIDENCE_MAX_BYTES) throw new Error("DELIVERY_FILE_SIZE_INVALID");
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) throw new Error("DELIVERY_FILE_EXTENSION_NOT_ALLOWED");
}

export async function uploadDeliveryEvidence(input: { bucket: string; objectKey: string; file: File }) {
  validateDeliveryEvidenceFile(input.file);
  try { await ensurePrivateBucket({ bucket: input.bucket, maxBytes: DELIVERY_EVIDENCE_MAX_BYTES, allowedMimeTypes: DELIVERY_EVIDENCE_MIME_TYPES }); }
  catch (error) { throw new Error(`DELIVERY_BUCKET_CREATE_FAILED:${detail(error)}`); }
  try { return await uploadBufferedPrivateObject(input); }
  catch (error) { throw new Error(`DELIVERY_STORAGE_UPLOAD_FAILED:${detail(error)}`); }
}

export async function removeDeliveryEvidence(bucket: string, objectKey: string) {
  try { await removePrivateObject(bucket, objectKey); }
  catch (error) { throw new Error(`DELIVERY_STORAGE_REMOVE_FAILED:${detail(error)}`); }
}

export async function createDeliveryEvidenceDownloadUrl(input: { bucket: string; objectKey: string; filename: string }) {
  return createPrivateDownloadUrl({ ...input, expiresInSeconds: 60 });
}
