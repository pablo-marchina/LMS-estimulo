import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = "https://cfpfeavjlgheqqiaqtzv.supabase.co";
const publishableKey = "sb_publishable_knKAm6ycwAH8_Ha9SqnrQw_xenjHzRR";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash")?.trim() ?? "";
  if (!tokenHash) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
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
