import "server-only";

import { randomUUID } from "node:crypto";
import { libraryRuntime } from "@/lib/library/runtime";
import { validateAnnouncementBanner } from "@/lib/storage/announcement-banners";
import { libraryContentBucket, removeLibraryContent, uploadLibraryContent } from "@/lib/storage/library-content";

export async function uploadAdministrativeImage(input: {
  actorUserAccountId: string;
  organizationId: string;
  file: File;
  source: string;
  role: string;
}) {
  validateAnnouncementBanner(input.file);
  const bucket = libraryContentBucket();
  const key = randomUUID();
  let intentId: string | null = null;
  let objectKey: string | null = null;
  let created = false;
  try {
    const intent = await libraryRuntime.createUploadIntent({
      actorUserAccountId: input.actorUserAccountId,
      organizationId: input.organizationId,
      originalFilename: input.file.name,
      expectedContentType: input.file.type,
      storageProvider: "supabase_storage",
      bucket,
      idempotencyKey: `${key}:intent`,
    });
    intentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;
    const uploaded = await uploadLibraryContent({ bucket, objectKey, file: input.file });
    created = uploaded.created;
    const confirmed = await libraryRuntime.confirmUpload({
      actorUserAccountId: input.actorUserAccountId,
      organizationId: input.organizationId,
      uploadIntentId: intentId,
      actualContentType: input.file.type,
      actualSizeBytes: input.file.size,
      sha256: uploaded.sha256,
      providerObjectVersion: uploaded.providerObjectVersion,
      etag: uploaded.etag,
      metadata: { source: input.source, role: input.role, originalFilename: input.file.name },
      idempotencyKey: `${key}:confirm`,
    });
    return confirmed.data.file_object_id;
  } catch (error) {
    if (intentId) await libraryRuntime.abortUpload(input.actorUserAccountId, input.organizationId, intentId, `${input.source.toUpperCase()}_UPLOAD_FAILED`, `${key}:abort`).catch(() => undefined);
    if (created && objectKey) await removeLibraryContent(bucket, objectKey).catch(() => undefined);
    throw error;
  }
}
