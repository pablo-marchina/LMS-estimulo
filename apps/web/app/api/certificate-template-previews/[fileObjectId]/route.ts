import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const SIGNED_URL_SECONDS = 900;
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type CertificateTemplateDescriptor = {
  file_object_id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  original_filename: string | null;
};

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
    // The RPC is SECURITY DEFINER and validates engagement.manage for the actor.
    // Calling it directly avoids an unnecessary second Edge Function hop for image rendering.
    const { data, error } = await createPrivilegedClient().rpc("get_admin_certificate_template_preview_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_organization_id: organizationId.data,
      p_file_object_id: fileId.data,
    });
    if (error || !data) {
      throw new Error(`${error?.code ?? "CERTIFICATE_TEMPLATE_PREVIEW_DESCRIPTOR_MISSING"}:${error?.message ?? "missing_descriptor"}`);
    }
    const descriptor = data as CertificateTemplateDescriptor;
    const url = await createPrivateDownloadUrl({
      bucket: descriptor.bucket,
      objectKey: descriptor.object_key,
      expiresInSeconds: SIGNED_URL_SECONDS,
    });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "cache-control": PRIVATE_MEDIA_CACHE_CONTROL },
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
    }, { status, headers: { "cache-control": "no-store" } });
  }
}
