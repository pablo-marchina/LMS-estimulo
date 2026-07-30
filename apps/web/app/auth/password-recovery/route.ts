import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client = await createSessionClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  let error: { message?: string } | null = null;

  if (code) {
    const result = await client.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash) {
    const result = await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    error = result.error;
  } else {
    error = { message: "RECOVERY_TOKEN_MISSING" };
  }

  if (error) {
    console.error("PASSWORD_RECOVERY_CALLBACK_FAILED", { message: error.message });
    return NextResponse.redirect(new URL("/recuperar-senha?erro=link_invalido", request.url), 303);
  }

  return NextResponse.redirect(new URL("/redefinir-senha", request.url), 303);
}
