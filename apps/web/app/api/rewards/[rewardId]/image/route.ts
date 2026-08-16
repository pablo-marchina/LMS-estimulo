import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { createRewardImageUrl } from "@/lib/storage/reward-images";

export const dynamic = "force-dynamic";
const PRIVATE_MEDIA_CACHE_CONTROL = "private, max-age=300";

export async function GET(_request: Request, { params }: { params: Promise<{ rewardId: string }> }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.json({ error: "AUTHENTICATED_SESSION_REQUIRED" }, { status: 401 });
  const parsed = z.string().uuid().safeParse((await params).rewardId);
  if (!parsed.success) return NextResponse.json({ error: "REWARD_ID_INVALID" }, { status: 400 });

  try {
    const descriptor = await extensionsRuntime.rewardImageDownload(auth.identity.user_account_id, parsed.data);
    const url = await createRewardImageUrl({ bucket: descriptor.bucket, objectKey: descriptor.object_key });
    return NextResponse.redirect(url, { status: 302, headers: { "cache-control": PRIVATE_MEDIA_CACHE_CONTROL, vary: "Cookie" } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const status = raw.includes("FORBIDDEN") || raw.includes("42501") ? 403 : raw.includes("NOT_FOUND") || raw.includes("P0002") ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? "REWARD_IMAGE_NOT_FOUND" : status === 403 ? "FORBIDDEN" : "REWARD_IMAGE_UNAVAILABLE" }, { status, headers: { "cache-control": "no-store" } });
  }
}
