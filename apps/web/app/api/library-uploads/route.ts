import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";
import {
  libraryContentBucket,
  removeLibraryContent,
  uploadLibraryContent,
  validateLibraryContentFile,
} from "@/lib/storage/library-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function errorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : "LIBRARY_UPLOAD_FAILED";
  const code = raw.split(":", 1)[0]?.trim() || "LIBRARY_UPLOAD_FAILED";
  return /^[A-Z0-9_]+$/.test(code) ? code : "LIBRARY_UPLOAD_FAILED";
}

function adminRedirect(request: NextRequest, organizationId: string, params: Record<string, string>) {
  const target = new URL("/admin/biblioteca", request.url);
  target.searchParams.set("organization", organizationId);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
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
  const key = randomUUID();

  try {
    const formData = await request.formData();
    organizationId = uuid.parse(formData.get("organization_id"));
    const organization = auth.identity.organizations.find((item) => item.organization_id === organizationId);
    if (!organization?.permissions.includes("library.manage")) throw new Error("FORBIDDEN");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("LIBRARY_FILE_REQUIRED");
    validateLibraryContentFile(file);

    bucket = libraryContentBucket();
    const intent = await libraryRuntime.createUploadIntent({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      originalFilename: file.name,
      expectedContentType: file.type,
      storageProvider: "supabase_storage",
      bucket,
      idempotencyKey: key,
    });
    uploadIntentId = intent.data.upload_intent_id;
    objectKey = intent.data.object_key;

    const uploaded = await uploadLibraryContent({ bucket, objectKey, file });
    objectCreated = uploaded.created;
    const confirmed = await libraryRuntime.confirmUpload({
      actorUserAccountId: auth.identity.user_account_id,
      organizationId,
      uploadIntentId,
      actualContentType: file.type,
      actualSizeBytes: file.size,
      sha256: uploaded.sha256,
      providerObjectVersion: uploaded.providerObjectVersion,
      etag: uploaded.etag,
      metadata: { source: "admin_library", originalFilename: file.name },
      idempotencyKey: `${key}:confirm`,
    });

    return adminRedirect(request, organizationId, {
      arquivo: confirmed.data.file_object_id,
      nomeArquivo: confirmed.data.original_filename,
      upload: "concluido",
    });
  } catch (error) {
    const code = errorCode(error);
    if (uploadIntentId && organizationId) {
      await libraryRuntime.abortUpload(
        auth.identity.user_account_id,
        organizationId,
        uploadIntentId,
        code,
        `${key}:abort`,
      ).catch(() => undefined);
    }
    if (objectCreated && bucket && objectKey) {
      await removeLibraryContent(bucket, objectKey).catch(() => undefined);
    }
    if (organizationId) return adminRedirect(request, organizationId, { upload: "erro", codigo: code });
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
