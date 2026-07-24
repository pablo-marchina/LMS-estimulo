import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";
import { createLibraryContentDownloadUrl } from "@/lib/storage/library-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { versionId } = await params;
    const file = await libraryRuntime.getFileDownload(auth.identity.user_account_id, uuid.parse(versionId));
    const signedUrl = await createLibraryContentDownloadUrl({
      bucket: file.bucket,
      objectKey: file.object_key,
      filename: file.filename,
    });
    return NextResponse.redirect(signedUrl, 303);
  } catch {
    return new NextResponse("Conteúdo não encontrado ou sem acesso.", { status: 404 });
  }
}
