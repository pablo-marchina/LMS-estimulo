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
const keySchema = z.string().min(3).max(160).regex(/^[a-z][a-z0-9_.-]+$/);
const variantSchema = z.enum(["desktop", "mobile"]);

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);

  try {
    const descriptor = await invokeServerRpc<Descriptor>("get_interface_content_image_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_content_key: keySchema.parse(request.nextUrl.searchParams.get("key")),
      p_variant: variantSchema.parse(request.nextUrl.searchParams.get("variant") ?? "desktop"),
      p_include_draft: request.nextUrl.searchParams.get("draft") === "1",
    });
    const signedUrl = await createPrivateDownloadUrl({
      bucket: descriptor.bucket,
      objectKey: descriptor.object_key,
      expiresInSeconds: SIGNED_URL_SECONDS,
    });
    const response = NextResponse.redirect(signedUrl, 303);
    response.headers.set("cache-control", PRIVATE_MEDIA_CACHE_CONTROL);
    return response;
  } catch {
    return new NextResponse("Imagem não disponível.", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
