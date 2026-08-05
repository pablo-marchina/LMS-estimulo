import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { interfaceMediaRuntime } from "@/lib/interface-content/media-runtime";
import { createInterfaceMediaUrl } from "@/lib/storage/interface-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileObjectId: string }> },
) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { fileObjectId } = await context.params;
    const id = z.string().uuid().parse(fileObjectId);
    const descriptor = await interfaceMediaRuntime.download(auth.identity.user_account_id, id);
    const url = await createInterfaceMediaUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key });
    return NextResponse.redirect(url, 307);
  } catch {
    return new NextResponse("Imagem não disponível", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  }
}
