import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { libraryRuntime } from "@/lib/library/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payload = z.object({
  libraryItemVersionId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(128)
});

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const input = payload.parse(await request.json());
    const result = await libraryRuntime.recordAccess({
      actorUserAccountId: auth.identity.user_account_id,
      libraryItemVersionId: input.libraryItemVersionId,
      action: "view",
      source: "library_detail",
      idempotencyKey: input.idempotencyKey
    });
    return NextResponse.json({ recorded: true, replayed: result.replayed });
  } catch {
    return NextResponse.json({ error: "LIBRARY_ACCESS_NOT_RECORDED" }, { status: 400 });
  }
}
