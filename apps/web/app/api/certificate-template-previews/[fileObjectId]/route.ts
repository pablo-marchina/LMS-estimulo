import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { invokeMediaDescriptorGateway, MediaGatewayError } from "@/lib/rpc/media-gateway";

export const dynamic = "force-dynamic";
const SIGNED_URL_SECONDS = 900;
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type Descriptor = { bucket: string; object_key: string; signed_url?: string };

export async function GET(request: Request, { params }: { params: Promise<{ fileObjectId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "AUTHENTICATED_SESSION_REQUIRED" }, { status: 401 });
  }

  const fileId = z.string().uuid().safeParse((await params).fileObjectId);
  const searchParams = new URL(request.url).searchParams;
  const organizationId = z.string().uuid().safeParse(searchParams.get("organization_id") ?? searchParams.get("organization"));
  if (!fileId.success || !organizationId.success) {
    return NextResponse.json({ error: "CERTIFICATE_TEMPLATE_PREVIEW_REQUEST_INVALID" }, { status: 400 });
  }

  try {
    const descriptor = await invokeMediaDescriptorGateway<Descriptor>("get_admin_certificate_template_preview_download", {
      p_organization_id: organizationId.data,
      p_file_object_id: fileId.data,
    });
    const url = descriptor.signed_url
      ?? await createPrivateDownloadUrl({
        bucket: descriptor.bucket,
        objectKey: descriptor.object_key,
        expiresInSeconds: SIGNED_URL_SECONDS,
      });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "cache-control": PRIVATE_MEDIA_CACHE_CONTROL, vary: "Cookie" },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const status = error instanceof MediaGatewayError && ["AUTHENTICATED_SESSION_REQUIRED", "VERIFIED_SESSION_REQUIRED"].includes(error.code)
      ? 401
      : raw.includes("FORBIDDEN") || raw.includes("42501")
        ? 403
        : raw.includes("NOT_FOUND") || raw.includes("P0002")
          ? 404
          : 500;
    return NextResponse.json({
      error: status === 404
        ? "CERTIFICATE_TEMPLATE_PREVIEW_NOT_FOUND"
        : status === 403
          ? "FORBIDDEN"
          : status === 401
            ? "AUTHENTICATED_SESSION_REQUIRED"
            : "CERTIFICATE_TEMPLATE_PREVIEW_UNAVAILABLE",
    }, { status, headers: { "cache-control": "no-store" } });
  }
}
