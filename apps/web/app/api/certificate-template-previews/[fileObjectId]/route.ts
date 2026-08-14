import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ fileObjectId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "AUTHENTICATED_SESSION_REQUIRED" }, { status: 401 });
  }

  const fileId = z.string().uuid().safeParse((await params).fileObjectId);
  const organizationId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("organization"));
  if (!fileId.success || !organizationId.success) {
    return NextResponse.json({ error: "CERTIFICATE_TEMPLATE_PREVIEW_REQUEST_INVALID" }, { status: 400 });
  }

  try {
    const descriptor = await extensionsRuntime.certificateTemplatePreviewDownload(
      auth.identity.user_account_id,
      organizationId.data,
      fileId.data,
    );
    const url = await createPrivateDownloadUrl({
      bucket: descriptor.bucket,
      objectKey: descriptor.object_key,
      expiresInSeconds: 300,
    });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const status = raw.includes("FORBIDDEN") || raw.includes("42501")
      ? 403
      : raw.includes("NOT_FOUND") || raw.includes("P0002")
        ? 404
        : 500;
    return NextResponse.json({
      error: status === 404
        ? "CERTIFICATE_TEMPLATE_PREVIEW_NOT_FOUND"
        : status === 403
          ? "FORBIDDEN"
          : "CERTIFICATE_TEMPLATE_PREVIEW_UNAVAILABLE",
    }, { status });
  }
}
