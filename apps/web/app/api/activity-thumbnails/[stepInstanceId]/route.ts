import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SIGNED_URL_SECONDS = 900;
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type Descriptor = { bucket: string; object_key: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ stepInstanceId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const descriptor = await invokeServerRpc<Descriptor>("get_participant_lesson_thumbnail_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_step_instance_id: z.string().uuid().parse((await params).stepInstanceId),
    });
    const url = await createPrivateDownloadUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key, expiresInSeconds: SIGNED_URL_SECONDS });
    const response = NextResponse.redirect(url, 303);
    response.headers.set("cache-control", PRIVATE_MEDIA_CACHE_CONTROL);
    return response;
  } catch {
    return new NextResponse("Thumb não disponível.", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
