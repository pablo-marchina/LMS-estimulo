import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import {
  announcementBannerBucket,
  removeAnnouncementBanner,
  uploadAnnouncementBanner,
  validateAnnouncementBanner,
} from "@/lib/storage/announcement-banners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();
const statusSchema = z.enum(["draft", "published", "retired"]);
const displayModeSchema = z.enum(["image_only", "image_with_text"]);

type UploadedObject = {
  uploadIntentId: string;
  bucket: string;
  objectKey: string;
  created: boolean;
};

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function nullable(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function fileFrom(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function isoDate(value: FormDataEntryValue | null): string | null {
  const text = nullable(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) throw new Error("ANNOUNCEMENT_DATE_INVALID");
  return parsed.toISOString();
}

function code(error: unknown): string {
  const raw = error instanceof Error ? error.message : "ANNOUNCEMENT_SAVE_FAILED";
  const value = raw.split(":", 1)[0]?.trim() || "ANNOUNCEMENT_SAVE_FAILED";
  return /^[A-Z0-9_]+$/.test(value) ? value : "ANNOUNCEMENT_SAVE_FAILED";
}

function redirectToAdmin(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/admin/engajamento", request.url);
  for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

async function uploadFile(input: {
  file: File;
  variant: "desktop" | "mobile";
  actorUserAccountId: string;
  organizationId: string;
  requestKey: string;
}): Promise<{ fileObjectId: string; uploaded: UploadedObject }> {
  validateAnnouncementBanner(input.file);
  const bucket = announcementBannerBucket();
  const intent = await engagementRuntime.createAnnouncementUploadIntent({
    actorUserAccountId: input.actorUserAccountId,
    organizationId: input.organizationId,
    originalFilename: input.file.name,
    expectedContentType: input.file.type,
    bucket,
    idempotencyKey: `${input.requestKey}:${input.variant}:upload`,
  });
  const uploaded = await uploadAnnouncementBanner({
    bucket,
    objectKey: intent.data.object_key,
    file: input.file,
  });
  const confirmed = await engagementRuntime.confirmAnnouncementUpload({
    actorUserAccountId: input.actorUserAccountId,
    organizationId: input.organizationId,
    uploadIntentId: intent.data.upload_intent_id,
    actualContentType: input.file.type,
    actualSizeBytes: input.file.size,
    sha256: uploaded.sha256,
    providerObjectVersion: uploaded.providerObjectVersion,
    etag: uploaded.etag,
    metadata: {
      source: "admin_announcement",
      variant: input.variant,
      originalFilename: input.file.name,
    },
    idempotencyKey: `${input.requestKey}:${input.variant}:confirm`,
  });
  return {
    fileObjectId: confirmed.data.file_object_id,
    uploaded: {
      uploadIntentId: intent.data.upload_intent_id,
      bucket,
      objectKey: intent.data.object_key,
      created: uploaded.created,
    },
  };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);

  let organizationId = "";
  const uploadedObjects: UploadedObject[] = [];
  const requestKey = randomUUID();

  try {
    const formData = await request.formData();
    organizationId = uuid.parse(formData.get("organization_id"));
    const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
    if (!organization?.permissions.includes("engagement.manage")) throw new Error("FORBIDDEN");

    const announcementId = nullable(formData.get("announcement_id"));
    if (announcementId) uuid.parse(announcementId);
    const expectedVersionRaw = nullable(formData.get("expected_version"));
    const expectedVersion = expectedVersionRaw === null ? null : z.coerce.number().int().nonnegative().parse(expectedVersionRaw);
    const displayMode = displayModeSchema.parse(formData.get("display_mode"));
    const status = statusSchema.parse(formData.get("status"));
    const priority = z.coerce.number().int().min(-1000).max(1000).parse(formData.get("priority") ?? 0);
    const startsAt = isoDate(formData.get("starts_at"));
    const endsAt = isoDate(formData.get("ends_at"));
    if (startsAt && endsAt && endsAt <= startsAt) throw new Error("ANNOUNCEMENT_WINDOW_INVALID");

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const imageAlt = nullable(formData.get("image_alt"));
    const ctaLabel = nullable(formData.get("cta_label"));
    const ctaUrl = nullable(formData.get("cta_url"));
    if ((ctaLabel === null) !== (ctaUrl === null)) throw new Error("ANNOUNCEMENT_CTA_PAIR_REQUIRED");

    let desktopImageFileObjectId = nullable(formData.get("current_image_file_object_id"));
    let mobileImageFileObjectId = nullable(formData.get("current_mobile_image_file_object_id"));
    if (desktopImageFileObjectId) uuid.parse(desktopImageFileObjectId);
    if (mobileImageFileObjectId) uuid.parse(mobileImageFileObjectId);

    const desktopFile = fileFrom(formData, "desktop_file") ?? fileFrom(formData, "file");
    const mobileFile = fileFrom(formData, "mobile_file");

    if (desktopFile) {
      const result = await uploadFile({
        file: desktopFile,
        variant: "desktop",
        actorUserAccountId: auth.identity.user_account_id,
        organizationId,
        requestKey,
      });
      desktopImageFileObjectId = result.fileObjectId;
      uploadedObjects.push(result.uploaded);
    }

    if (mobileFile) {
      const result = await uploadFile({
        file: mobileFile,
        variant: "mobile",
        actorUserAccountId: auth.identity.user_account_id,
        organizationId,
        requestKey,
      });
      mobileImageFileObjectId = result.fileObjectId;
      uploadedObjects.push(result.uploaded);
    }

    if (displayMode === "image_only" && !desktopImageFileObjectId) throw new Error("ANNOUNCEMENT_IMAGE_REQUIRED");

    await engagementRuntime.saveAnnouncement({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      announcementId,
      expectedVersion,
      title,
      body,
      ctaLabel,
      ctaUrl,
      status,
      priority,
      startsAt,
      endsAt,
      imageFileObjectId: desktopImageFileObjectId,
      mobileImageFileObjectId,
      imageAlt,
      displayMode,
      idempotencyKey: `${requestKey}:save`,
    });

    return redirectToAdmin(request, { sucesso: "salvo", view: "gerenciar" });
  } catch (error) {
    const failureCode = code(error);
    await Promise.all(uploadedObjects.map(async (uploaded, index) => {
      if (organizationId) {
        await engagementRuntime.abortAnnouncementUpload(
          auth.identity.user_account_id,
          organizationId,
          uploaded.uploadIntentId,
          failureCode,
          `${requestKey}:abort:${index}`,
        ).catch(() => undefined);
      }
      if (uploaded.created) await removeAnnouncementBanner(uploaded.bucket, uploaded.objectKey).catch(() => undefined);
    }));
    return redirectToAdmin(request, { erro: failureCode });
  }
}
