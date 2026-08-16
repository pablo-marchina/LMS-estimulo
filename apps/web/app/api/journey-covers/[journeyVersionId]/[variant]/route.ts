import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import { createPrivilegedClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();
const variantSchema = z.enum(["card", "featured"]);
const SIGNED_URL_SECONDS = 900;
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";
type CoverDescriptor = { bucket: string; object_key: string; filename: string; content_type: string };

export async function GET(request: NextRequest, { params }: { params: Promise<{ journeyVersionId: string; variant: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { journeyVersionId, variant } = await params;
    const descriptor = await invokeServerRpc<CoverDescriptor>("get_journey_cover_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_journey_version_id: uuid.parse(journeyVersionId),
      p_variant: variantSchema.parse(variant),
    });
    const client = createPrivilegedClient();
    const { data, error } = await client.storage.from(descriptor.bucket).createSignedUrl(descriptor.object_key, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error("JOURNEY_COVER_SIGNED_URL_FAILED");
    const response = NextResponse.redirect(data.signedUrl, 303);
    response.headers.set("cache-control", PRIVATE_MEDIA_CACHE_CONTROL);
    response.headers.set("vary", "Cookie");
    return response;
  } catch {
    return new NextResponse("Imagem da jornada não encontrada.", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
