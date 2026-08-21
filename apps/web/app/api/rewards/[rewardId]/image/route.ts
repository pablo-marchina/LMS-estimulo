import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { INTERFACE_PREVIEW_REQUEST_HEADER } from "@/lib/interface-preview/constants";
import { invokeMediaDescriptorGateway, MediaGatewayError } from "@/lib/rpc/media-gateway";
import { createRewardImageUrl } from "@/lib/storage/reward-images";

export const dynamic = "force-dynamic";
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type Descriptor = { bucket: string; object_key: string; signed_url?: string };

export async function GET(request: Request, { params }: { params: Promise<{ rewardId: string }> }) {
  const parsed = z.string().uuid().safeParse((await params).rewardId);
  if (!parsed.success) return NextResponse.json({ error: "REWARD_ID_INVALID" }, { status: 400 });

  try {
    let descriptor: Descriptor;
    const interfacePreview = request.headers.get(INTERFACE_PREVIEW_REQUEST_HEADER) === "1";
    if (interfacePreview) {
      const auth = await getAuthContext();
      if (auth.status !== "authenticated") return NextResponse.json({ error: "AUTHENTICATED_SESSION_REQUIRED" }, { status: 401 });
      descriptor = await extensionsRuntime.rewardImageDownload(auth.identity.user_account_id, parsed.data);
    } else {
      descriptor = await invokeMediaDescriptorGateway<Descriptor>("get_reward_image_download", {
        p_reward_id: parsed.data,
      });
    }
    const url = !interfacePreview && descriptor.signed_url
      ? descriptor.signed_url
      : await createRewardImageUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key });
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": PRIVATE_MEDIA_CACHE_CONTROL, vary: "Cookie" } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const status = error instanceof MediaGatewayError && ["AUTHENTICATED_SESSION_REQUIRED", "VERIFIED_SESSION_REQUIRED"].includes(error.code)
      ? 401
      : raw.includes("FORBIDDEN") || raw.includes("42501")
        ? 403
        : raw.includes("NOT_FOUND") || raw.includes("P0002")
          ? 404
          : 500;
    return NextResponse.json({ error: status === 404 ? "REWARD_IMAGE_NOT_FOUND" : status === 403 ? "FORBIDDEN" : status === 401 ? "AUTHENTICATED_SESSION_REQUIRED" : "REWARD_IMAGE_UNAVAILABLE" }, { status, headers: { "cache-control": "no-store" } });
  }
}
