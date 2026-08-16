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

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function nullable(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
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

const privateParticipantDestination = /^\/empreendedor\/(?:jornada|trilha|atividade|validacao)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/|$)/i;

function validatedAnnouncementDestination(value: string | null): string | null {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value, "https://estimulo.invalid");
  } catch {
    throw new Error("ANNOUNCEMENT_DESTINATION_INVALID");
  }
  if (privateParticipantDestination.test(parsed.pathname)) {
    throw new Error("ANNOUNCEMENT_PRIVATE_DESTINATION_NOT_ALLOWED");
  }
  return value;
}

function redirectToAdmin(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/admin/engajamento", request.url);
  for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  const identity = auth.identity;

  let organizationId = "";
  const createdUploads: Array<{ uploadIntentId: string; bucket: string; objectKey: string; objectCreated: boolean }> = [];
  const requestKey = randomUUID();

  try {
    const formData = await request.formData();
    organizationId = uuid.parse(formData.get("organization_id"));
    const organization = identity.organizations.find((item) => item.organization_id === organizationId);
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
    const ctaUrl = validatedAnnouncementDestination(nullable(formData.get("cta_url")));
    // The participant experience makes the entire artwork clickable. The RPC still
    // accepts the legacy label/url pair, so keep an internal accessible label without
    // exposing a redundant button-label field in Admin.
    const ctaLabel = ctaUrl ? (title || imageAlt || "Abrir anúncio") : null;

    let imageFileObjectId = nullable(formData.get("current_image_file_object_id"));
    let mobileImageFileObjectId = nullable(formData.get("current_mobile_image_file_object_id"));
    if (imageFileObjectId) uuid.parse(imageFileObjectId);
    if (mobileImageFileObjectId) uuid.parse(mobileImageFileObjectId);

    async function uploadVariant(field: string, role: "desktop" | "mobile", current: string | null) {
      const fileEntry = formData.get(field);
      const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
      if (!file) return current;
      validateAnnouncementBanner(file);
      const bucket = announcementBannerBucket();
      const intent = await engagementRuntime.createAnnouncementUploadIntent({
        actorUserAccountId: identity.user_account_id,
        organizationId,
        originalFilename: file.name,
        expectedContentType: file.type,
        bucket,
        idempotencyKey: `${requestKey}:${role}:upload`,
      });
      const uploaded = await uploadAnnouncementBanner({ bucket, objectKey: intent.data.object_key, file });
      createdUploads.push({ uploadIntentId: intent.data.upload_intent_id, bucket, objectKey: intent.data.object_key, objectCreated: uploaded.created });
      const confirmed = await engagementRuntime.confirmAnnouncementUpload({
        actorUserAccountId: identity.user_account_id,
        organizationId,
        uploadIntentId: intent.data.upload_intent_id,
        actualContentType: file.type,
        actualSizeBytes: file.size,
        sha256: uploaded.sha256,
        providerObjectVersion: uploaded.providerObjectVersion,
        etag: uploaded.etag,
        metadata: { source: "admin_announcement", role, originalFilename: file.name },
        idempotencyKey: `${requestKey}:${role}:confirm`,
      });
      return confirmed.data.file_object_id;
    }

    imageFileObjectId = await uploadVariant("desktop_file", "desktop", imageFileObjectId);
    mobileImageFileObjectId = await uploadVariant("mobile_file", "mobile", mobileImageFileObjectId);

    await engagementRuntime.saveAnnouncement({
      actorUserAccountId: identity.user_account_id,
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
      imageFileObjectId,
      mobileImageFileObjectId,
      imageAlt,
      displayMode,
      idempotencyKey: `${requestKey}:save`,
    });

    return redirectToAdmin(request, { sucesso: "salvo", view: "gerenciar" });
  } catch (error) {
    const failureCode = code(error);
    if (organizationId) {
      await Promise.all(createdUploads.map((upload, index) => engagementRuntime.abortAnnouncementUpload(
        identity.user_account_id,
        organizationId,
        upload.uploadIntentId,
        failureCode,
        `${requestKey}:abort:${index}`,
      ).catch(() => undefined)));
    }
    await Promise.all(createdUploads.filter((upload) => upload.objectCreated).map((upload) => removeAnnouncementBanner(upload.bucket, upload.objectKey).catch(() => undefined)));
    return redirectToAdmin(request, { erro: failureCode });
  }
}
