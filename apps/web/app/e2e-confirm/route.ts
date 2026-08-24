import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash")?.trim() ?? "";
  if (!tokenHash) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  const client = await createSessionClient();
  const { error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "signup",
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.code ?? "verification_failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
