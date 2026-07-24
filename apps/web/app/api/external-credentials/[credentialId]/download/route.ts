import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { createCredentialDownloadUrl } from "@/lib/storage/credential-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ credentialId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { credentialId } = await params;
    const file = await extendedCredentialRuntime.externalDownload(auth.identity.user_account_id, credentialId);
    const signed = await createCredentialDownloadUrl({ bucket: file.bucket, objectKey: file.object_key, filename: file.filename });
    return NextResponse.redirect(signed, 303);
  } catch {
    return NextResponse.redirect(new URL("/empreendedor/conquistas?certificadoExterno=indisponivel#certificados-externos", request.url), 303);
  }
}
