import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { INTERFACE_PREVIEW_REQUEST_HEADER } from "@/lib/interface-preview/constants";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { invokeMediaDescriptorGateway, MediaGatewayError } from "@/lib/rpc/media-gateway";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SIGNED_URL_SECONDS = 900;
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type Descriptor = { bucket: string; object_key: string; signed_url?: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ stepInstanceId: string }> }) {
  try {
    const stepInstanceId = z.string().uuid().parse((await params).stepInstanceId);
    let descriptor: Descriptor;
    const interfacePreview = request.headers.get(INTERFACE_PREVIEW_REQUEST_HEADER) === "1";
    if (interfacePreview) {
      const auth = await getAuthContext();
      if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
      descriptor = await invokeServerRpc<Descriptor>("get_participant_lesson_thumbnail_download", {
        p_actor_user_account_id: auth.identity.user_account_id,
        p_step_instance_id: stepInstanceId,
      });
    } else {
      descriptor = await invokeMediaDescriptorGateway<Descriptor>("get_participant_lesson_thumbnail_download", {
        p_step_instance_id: stepInstanceId,
      });
    }
    const url = !interfacePreview && descriptor.signed_url
      ? descriptor.signed_url
      : await createPrivateDownloadUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key, expiresInSeconds: SIGNED_URL_SECONDS });
    const response = NextResponse.redirect(url, 303);
    response.headers.set("cache-control", PRIVATE_MEDIA_CACHE_CONTROL);
    response.headers.set("vary", "Cookie");
    return response;
  } catch (error) {
    if (error instanceof MediaGatewayError && ["AUTHENTICATED_SESSION_REQUIRED", "VERIFIED_SESSION_REQUIRED"].includes(error.code)) {
      return NextResponse.redirect(new URL("/entrar", request.url), 303);
    }
    return new NextResponse("Thumb não disponível.", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
