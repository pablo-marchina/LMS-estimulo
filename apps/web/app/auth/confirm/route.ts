import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>(["signup", "email", "magiclink", "recovery", "invite", "email_change"]);

export async function GET(request: NextRequest) {
  const client = await createSessionClient();
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeValue = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");

  let error: unknown = null;
  if (tokenHash && typeValue && otpTypes.has(typeValue)) {
    ({ error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: typeValue }));
  } else if (code) {
    ({ error } = await client.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("CONFIRMATION_PARAMETERS_MISSING");
  }

  return NextResponse.redirect(new URL(error ? "/entrar?erro=confirmacao_invalida" : "/cadastro/concluir", request.url));
}
