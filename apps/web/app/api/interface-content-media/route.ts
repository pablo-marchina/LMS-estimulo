import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { INTERFACE_CONTENT_CACHE_TAG, publishAdminInterfaceContent, saveAdminInterfaceContent } from "@/lib/interface-content/runtime";
import { interfaceMediaRuntime } from "@/lib/interface-content/media-runtime";
import { interfaceMediaBucket, removeInterfaceMedia, uploadInterfaceMedia, validateInterfaceMedia } from "@/lib/storage/interface-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

type UploadedObject = { bucket: string; objectKey: string; created: boolean };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function fileFrom(formData: FormData, name: string) {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "INTERFACE_MEDIA_SAVE_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "INTERFACE_MEDIA_SAVE_FAILED";
  return /^[A-Z0-9_]+$/.test(code) ? code : "INTERFACE_MEDIA_SAVE_FAILED";
}

function redirectToEditor(request: NextRequest, contentKey: string, params: Record<string, string>) {
  const target = new URL("/admin/experiencia", request.url);
  target.searchParams.set("edit", contentKey);
  for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
  target.hash = "editor-elemento";
  return NextResponse.redirect(target, 303);
}

async function uploadFile(input: {
  file: File;
  variant: "desktop" | "mobile";
  actorUserAccountId: string;
  organizationId: string;
  requestKey: string;
}) {
  validateInterfaceMedia(input.file);
  const bucket = interfaceMediaBucket();
  const intent = await interfaceMediaRuntime.createUploadIntent({
    actorUserAccountId: input.actorUserAccountId,
    organizationId: input.organizationId,
    originalFilename: input.file.name,
    expectedContentType: input.file.type,
    bucket,
    idempotencyKey: `${input.requestKey}:${input.variant}:intent`,
  });
  const uploaded = await uploadInterfaceMedia({ bucket, objectKey: intent.data.object_key, file: input.file });
  const confirmed = await interfaceMediaRuntime.confirmUpload({
    actorUserAccountId: input.actorUserAccountId,
    organizationId: input.organizationId,
    uploadIntentId: intent.data.upload_intent_id,
    actualContentType: input.file.type,
    actualSizeBytes: input.file.size,
    sha256: uploaded.sha256,
    providerObjectVersion: uploaded.providerObjectVersion,
    etag: uploaded.etag,
    metadata: {
      source: "admin_interface_content",
      variant: input.variant,
      originalFilename: input.file.name,
    },
    idempotencyKey: `${input.requestKey}:${input.variant}:confirm`,
  });
  return {
    fileObjectId: confirmed.data.file_object_id,
    uploaded: { bucket, objectKey: intent.data.object_key, created: uploaded.created } satisfies UploadedObject,
  };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return NextResponse.redirect(new URL("/admin/experiencia?erro=sem_permissao", request.url), 303);
  const canManage = organization.permissions.includes("interface.content.manage") || organization.permissions.includes("journey.definition.manage");
  if (!canManage) return NextResponse.redirect(new URL("/admin/experiencia?erro=sem_permissao", request.url), 303);

  const uploadedObjects: UploadedObject[] = [];
  const requestKey = randomUUID();
  let contentKey = "";

  try {
    const formData = await request.formData();
    contentKey = text(formData, "content_key");
    if (!/^[a-z][a-z0-9_.-]{2,159}$/.test(contentKey)) throw new Error("INTERFACE_CONTENT_KEY_INVALID");

    let desktopId = text(formData, "current_image_file_object_id") || null;
    let mobileId = text(formData, "current_mobile_image_file_object_id") || null;
    if (desktopId) uuid.parse(desktopId);
    if (mobileId) uuid.parse(mobileId);

    const desktopFile = fileFrom(formData, "desktop_file");
    const mobileFile = fileFrom(formData, "mobile_file");

    if (desktopFile) {
      const result = await uploadFile({
        file: desktopFile,
        variant: "desktop",
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        requestKey,
      });
      desktopId = result.fileObjectId;
      uploadedObjects.push(result.uploaded);
    }

    if (mobileFile) {
      const result = await uploadFile({
        file: mobileFile,
        variant: "mobile",
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        requestKey,
      });
      mobileId = result.fileObjectId;
      uploadedObjects.push(result.uploaded);
    }

    if (checked(formData, "remove_desktop")) desktopId = null;
    if (checked(formData, "remove_mobile")) mobileId = null;

    const value = {
      text: text(formData, "text"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      href: text(formData, "href"),
      button_text: text(formData, "button_text"),
      image_url: desktopId ? `/api/interface-media/${desktopId}` : "",
      image_file_object_id: desktopId,
      mobile_image_file_object_id: mobileId,
      image_position: ["top", "bottom"].includes(text(formData, "image_position")) ? text(formData, "image_position") : "center",
      alt: text(formData, "alt"),
      tone: text(formData, "tone") || "neutral",
      visible: checked(formData, "visible"),
      order: Number.parseInt(text(formData, "order"), 10) || 0,
    };

    await saveAdminInterfaceContent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId: organization.organization_id,
      entries: [{ content_key: contentKey, locale: text(formData, "locale") || "pt-BR", value }],
      idempotencyKey: `${requestKey}:save`,
    });

    const publishNow = checked(formData, "publish_now");
    if (publishNow) {
      await publishAdminInterfaceContent({
        actorUserAccountId: auth.identity.user_account_id,
        organizationId: organization.organization_id,
        contentKeys: [contentKey],
        idempotencyKey: `${requestKey}:publish`,
      });
      updateTag(INTERFACE_CONTENT_CACHE_TAG);
    }

    revalidatePath("/", "layout");
    return redirectToEditor(request, contentKey, { sucesso: publishNow ? "interface_publicada" : "rascunho_salvo" });
  } catch (error) {
    await Promise.all(uploadedObjects.map((item) => item.created ? removeInterfaceMedia(item.bucket, item.objectKey).catch(() => undefined) : Promise.resolve()));
    return redirectToEditor(request, contentKey, { erro: errorCode(error) });
  }
}
