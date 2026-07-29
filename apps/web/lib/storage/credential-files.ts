import "server-only";
import {
  createPrivateDownloadUrl,
  downloadPrivateObject,
  ensurePrivateBucket,
  removePrivateObject,
  uploadBufferedPrivateObject,
} from "@/lib/platform/object-storage";

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

function detail(error: unknown): string {
  return error instanceof Error ? error.message : "unknown";
}

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
  if (!allowed.includes(contentType as never)) {
    throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_TYPE_NOT_ALLOWED" : "CERTIFICATE_TEMPLATE_TYPE_NOT_ALLOWED");
  }
  if (file.size < 1 || file.size > max) {
    throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_SIZE_INVALID" : "CERTIFICATE_TEMPLATE_SIZE_INVALID");
  }
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!EXTENSIONS[contentType]?.includes(extension)) {
    throw new Error(kind === "external" ? "EXTERNAL_CREDENTIAL_EXTENSION_NOT_ALLOWED" : "CERTIFICATE_TEMPLATE_EXTENSION_NOT_ALLOWED");
  }
}

export const validateExternalCredentialFile = (file: File) => validate(file, "external");
export const validateCertificateTemplateFile = (file: File) => validate(file, "template");

export async function uploadCredentialFile(input: {
  bucket: string;
  objectKey: string;
  file: File;
  kind: "external" | "template";
}) {
  validate(input.file, input.kind);
  const max = input.kind === "external" ? EXTERNAL_CREDENTIAL_MAX_BYTES : CERTIFICATE_TEMPLATE_MAX_BYTES;
  const types = input.kind === "external" ? EXTERNAL_TYPES : TEMPLATE_TYPES;

  try {
    await ensurePrivateBucket({ bucket: input.bucket, maxBytes: max, allowedMimeTypes: types });
  } catch (error) {
    throw new Error(`CREDENTIAL_BUCKET_CREATE_FAILED:${detail(error)}`);
  }

  try {
    return await uploadBufferedPrivateObject(input);
  } catch (error) {
    throw new Error(`CREDENTIAL_STORAGE_UPLOAD_FAILED:${detail(error)}`);
  }
}

export async function removeCredentialFile(bucket: string, objectKey: string) {
  try {
    await removePrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`CREDENTIAL_STORAGE_REMOVE_FAILED:${detail(error)}`);
  }
}

export async function createCredentialDownloadUrl(input: {
  bucket: string;
  objectKey: string;
  filename: string;
}) {
  try {
    return await createPrivateDownloadUrl({ ...input, expiresInSeconds: 60 });
  } catch (error) {
    throw new Error(`CREDENTIAL_SIGNED_URL_FAILED:${detail(error)}`);
  }
}

export async function downloadCredentialObject(bucket: string, objectKey: string): Promise<Buffer> {
  try {
    return await downloadPrivateObject(bucket, objectKey);
  } catch (error) {
    throw new Error(`CREDENTIAL_OBJECT_DOWNLOAD_FAILED:${detail(error)}`);
  }
}
