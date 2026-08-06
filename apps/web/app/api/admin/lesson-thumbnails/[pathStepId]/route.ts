import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Descriptor = { bucket: string; object_key: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ pathStepId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const descriptor = await invokeServerRpc<Descriptor>("get_admin_lesson_thumbnail_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_path_step_id: z.string().uuid().parse((await params).pathStepId),
    });
    const url = await createPrivateDownloadUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key, expiresInSeconds: 300 });
    return NextResponse.redirect(url, 303);
  } catch {
    return new NextResponse("Thumb não disponível.", { status: 404 });
  }
}
