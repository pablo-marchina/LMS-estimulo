import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: NextRequest, context: { params: Promise<{ assetId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const organization = administrativeOrganization(auth.identity);
  if (!organization?.permissions.includes("journey.definition.manage")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { assetId } = await context.params;
  const parsedAssetId = z.string().uuid().safeParse(assetId);
  if (!parsedAssetId.success) return NextResponse.json({ error: "INVALID_ASSET" }, { status: 400 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "INVALID_FIELDS" }, { status: 400 });
  }

  try {
    const data = await invokeServerRpc<Record<string, unknown>>("update_admin_activity_asset_metadata_by_asset", {
      p_actor_user_account_id: auth.identity.user_account_id,
      p_organization_id: organization.organization_id,
      p_asset_id: parsedAssetId.data,
      p_title: body.title,
      p_description: body.description,
      p_idempotency_key: randomUUID(),
    });
    return NextResponse.json({ data });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "ASSET_METADATA_SAVE_FAILED";
    const status = raw.includes("FORBIDDEN") ? 403 : raw.includes("NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: raw.split(":", 1)[0] || "ASSET_METADATA_SAVE_FAILED" }, { status });
  }
}
