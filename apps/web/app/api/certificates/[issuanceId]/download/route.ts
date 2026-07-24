import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { extendedCredentialRuntime } from "@/lib/credentials/extended-runtime";
import { generateCertificatePdf } from "@/lib/credentials/pdf";
import { downloadCredentialObject } from "@/lib/storage/credential-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return normalized || "certificado-estimulo";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ issuanceId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  try {
    const { issuanceId } = await params;
    const payload = await extendedCredentialRuntime.renderPayload(auth.identity.user_account_id, issuanceId);
    const templateBytes = payload.template ? await downloadCredentialObject(payload.template.bucket, payload.template.object_key).catch(() => null) : null;
    const pdf = generateCertificatePdf(payload, templateBytes);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(payload.certificate_name)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/empreendedor/conquistas?certificado=indisponivel#certificados-estimulo", request.url), 303);
  }
}
