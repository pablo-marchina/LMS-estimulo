import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { journeyRuntime } from "@/lib/journey-runtime/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  content_asset_id: z.string().uuid(),
  position_seconds: z.coerce.number().min(0).max(60 * 60 * 24),
  duration_seconds: z.coerce.number().positive().max(60 * 60 * 24).nullable(),
  completed: z.boolean(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.json({ code: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  try {
    const stepInstanceId = z.string().uuid().parse(request.nextUrl.searchParams.get("step"));
    const payload = payloadSchema.parse(await request.json());
    const result = await journeyRuntime.recordAssetProgress({
      actor: auth.identity.user_account_id,
      stepInstanceId,
      contentAssetId: payload.content_asset_id,
      positionSeconds: payload.position_seconds,
      durationSeconds: payload.duration_seconds,
      completed: payload.completed,
      key: randomUUID(),
    });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MEDIA_PROGRESS_FAILED";
    return NextResponse.json({ code: "MEDIA_PROGRESS_FAILED", message }, { status: 400 });
  }
}