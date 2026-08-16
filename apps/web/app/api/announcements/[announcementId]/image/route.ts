import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { INTERFACE_PREVIEW_REQUEST_HEADER } from "@/lib/interface-preview/constants";
import { invokeMediaDescriptorGateway, MediaGatewayError } from "@/lib/rpc/media-gateway";
import { createAnnouncementBannerUrl } from "@/lib/storage/announcement-banners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";

type Descriptor = { bucket: string; object_key: string };

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ announcementId: string }> },
) {
  try {
    const { announcementId } = await context.params;
    const id = z.string().uuid().parse(announcementId);
    const variant = request.nextUrl.searchParams.get("variant") === "mobile" ? "mobile" : "desktop";
    let descriptor: Descriptor;
    if (request.headers.get(INTERFACE_PREVIEW_REQUEST_HEADER) === "1") {
      const auth = await getAuthContext();
      if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
      descriptor = await engagementRuntime.getAnnouncementBannerDownload(auth.identity.user_account_id, id, variant);
    } else {
      descriptor = await invokeMediaDescriptorGateway<Descriptor>("get_announcement_banner_download", {
        p_announcement_id: id,
        p_variant: variant,
      });
    }
    const url = await createAnnouncementBannerUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key });
    const response = NextResponse.redirect(url, 307);
    response.headers.set("cache-control", PRIVATE_MEDIA_CACHE_CONTROL);
    response.headers.set("vary", "Cookie");
    return response;
  } catch (error) {
    if (error instanceof MediaGatewayError && ["AUTHENTICATED_SESSION_REQUIRED", "VERIFIED_SESSION_REQUIRED"].includes(error.code)) {
      return NextResponse.redirect(new URL("/entrar", request.url), 303);
    }
    return new NextResponse("Imagem não disponível", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
