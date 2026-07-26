import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { engagementRuntime } from "@/lib/engagement/runtime";
import { createAnnouncementBannerUrl } from "@/lib/storage/announcement-banners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ announcementId: string }> },
) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { announcementId } = await context.params;
    const id = z.string().uuid().parse(announcementId);
    const descriptor = await engagementRuntime.getAnnouncementBannerDownload(auth.identity.user_account_id, id);
    const url = await createAnnouncementBannerUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key });
    return NextResponse.redirect(url, 307);
  } catch {
    return new NextResponse("Imagem não disponível", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
