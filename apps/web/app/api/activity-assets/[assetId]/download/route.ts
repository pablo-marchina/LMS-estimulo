import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";
import { createLibraryContentDownloadUrl } from "@/lib/storage/library-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { assetId } = await params;
    const stepInstanceId = uuid.parse(request.nextUrl.searchParams.get("step"));
    const descriptor = await journeyRuntime.getActivityAssetDownload(auth.identity.user_account_id, stepInstanceId, uuid.parse(assetId));
    const signedUrl = await createLibraryContentDownloadUrl({
      bucket: descriptor.bucket,
      objectKey: descriptor.object_key,
      filename: descriptor.filename,
    });
    return NextResponse.redirect(signedUrl, 303);
  } catch {
    return new NextResponse("Conteúdo não encontrado ou sem acesso.", { status: 404 });
  }
}