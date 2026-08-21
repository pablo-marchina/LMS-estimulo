import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { createPrivateDownloadUrl } from "@/lib/platform/object-storage";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";

type Descriptor = { bucket: string; object_key: string; signed_url?: string };
const roleSchema = z.enum(["logo", "signature"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.redirect(new URL("/entrar", request.url), 303);
  const organization = administrativeOrganization(auth.identity);
  if (!organization) return new NextResponse("Mídia não disponível.", { status: 404 });

  try {
    const descriptor = await invokeServerRpc<Descriptor>("get_admin_certificate_issuer_media_download", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_organization_id: organization.organization_id,
      p_role: roleSchema.parse((await params).role),
    });
    const url = descriptor.signed_url
      ?? await createPrivateDownloadUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key, expiresInSeconds: 300 });
    return NextResponse.redirect(url, {
      status: 303,
      headers: { "cache-control": PRIVATE_MEDIA_CACHE_CONTROL, vary: "Cookie" },
    });
  } catch {
    return new NextResponse("Mídia não disponível.", { status: 404, headers: { "cache-control": "no-store" } });
  }
}
