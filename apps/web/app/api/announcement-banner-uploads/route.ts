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

function redirectToAdmin(request: NextRequest, params: Record<string, string>) {
  const target = new URL("/admin/engajamento", request.url);
  for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);

  let organizationId = "";
  let uploadIntentId: string | null = null;
  let bucket: string | null = null;
  let objectKey: string | null = null;
  let objectCreated = false;
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

    let imageFileObjectId = nullable(formData.get("current_image_file_object_id"));
    if (imageFileObjectId) uuid.parse(imageFileObjectId);
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    if (file) {
      validateAnnouncementBanner(file);
      bucket = announcementBannerBucket();
      const intent = await engagementRuntime.createAnnouncementUploadIntent({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId,
        originalFilename: file.name,
        expectedContentType: file.type,
        bucket,
        idempotencyKey: `${requestKey}:upload`,
      });
      uploadIntentId = intent.data.upload_intent_id;
      objectKey = intent.data.object_key;
      const uploaded = await uploadAnnouncementBanner({ bucket, objectKey, file });
      objectCreated = uploaded.created;
      const confirmed = await engagementRuntime.confirmAnnouncementUpload({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId,
        uploadIntentId,
        actualContentType: file.type,
        actualSizeBytes: file.size,
        sha256: uploaded.sha256,
        providerObjectVersion: uploaded.providerObjectVersion,
        etag: uploaded.etag,
        metadata: { source: "admin_announcement", originalFilename: file.name },
        idempotencyKey: `${requestKey}:confirm`,
      });
      imageFileObjectId = confirmed.data.file_object_id;
    }

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
      imageFileObjectId,
      imageAlt,
      displayMode,
      idempotencyKey: `${requestKey}:save`,
    });

    return redirectToAdmin(request, { sucesso: "salvo", view: "gerenciar" });
  } catch (error) {
    const failureCode = code(error);
    if (uploadIntentId && organizationId) {
      await engagementRuntime.abortAnnouncementUpload(
        auth.identity.user_account_id,
        organizationId,
        uploadIntentId,
        failureCode,
        `${requestKey}:abort`,
      ).catch(() => undefined);
    }
    if (objectCreated && bucket && objectKey) await removeAnnouncementBanner(bucket, objectKey).catch(() => undefined);
    return redirectToAdmin(request, { erro: failureCode });
  }
}
