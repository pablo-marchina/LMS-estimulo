"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>(["signup", "email", "magiclink", "recovery", "invite", "email_change"]);
const emailSchema = z.string().trim().email().max(320).transform((value: string) => value.toLowerCase());

function authErrorCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code : "";
}

function authErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function confirmationFailed(): never {
  redirect("/entrar?erro=confirmacao_invalida");
}

export async function confirmEmailAction(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const typeValue = String(formData.get("type") ?? "").trim() as EmailOtpType;
  const code = String(formData.get("code") ?? "").trim();
  const client = await createSessionClient();

  let error: unknown = null;
  if (tokenHash && otpTypes.has(typeValue)) {
    ({ error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: typeValue }));
  } else if (code) {
    ({ error } = await client.auth.exchangeCodeForSession(code));

    // The hosted confirmation endpoint verifies the email before redirecting
    // with the PKCE code. If the email was opened in another browser or by an
    // email scanner, the local verifier is unavailable even though the account
    // is already confirmed. In that case the correct recovery is password login.
    if (authErrorCode(error) === "bad_code_verifier") {
      redirect("/entrar?cadastro=confirmado");
    }
  } else {
    confirmationFailed();
  }

  if (error) {
    const { data, error: userError } = await client.auth.getUser();
    if (userError || !data.user?.email_confirmed_at) confirmationFailed();
  }

  redirect("/cadastro/concluir");
}

export async function resendConfirmationAction(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/confirm?erro=email_invalido");

  const client = await createSessionClient();
  const callback = new URL("/confirm", publicApplicationOrigin()).toString();
  const { error } = await client.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: callback },
  });

  if (error) {
    const code = authErrorCode(error);
    if (authErrorStatus(error) === 429 || code.includes("rate_limit")) {
      redirect("/confirm?erro=limite_envio");
    }
    redirect("/confirm?erro=envio_falhou");
  }

  // The response remains generic so it does not disclose whether an account
  // exists or whether it is already confirmed. Confirmed accounts do not get
  // another signup email even when the endpoint accepts the request.
  redirect("/confirm?reenviado=1");
}
