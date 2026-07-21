"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>(["signup", "email", "magiclink", "recovery", "invite", "email_change"]);
const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

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
  if (!parsed.success) redirect("/auth/confirm?erro=email_invalido");

  const client = await createSessionClient();
  const callback = new URL("/auth/confirm", publicApplicationOrigin()).toString();
  await client.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: callback },
  });

  // A resposta é deliberadamente genérica para não revelar se a conta existe.
  redirect("/auth/confirm?reenviado=1");
}
