"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

export async function requestPasswordRecoveryAction(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/recuperar-senha?erro=email_invalido");

  const client = await createSessionClient();
  const redirectTo = new URL("/auth/password-recovery", publicApplicationOrigin()).toString();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, { redirectTo });

  if (error?.status === 429 || error?.code?.includes("rate_limit")) {
    redirect("/recuperar-senha?erro=limite_email");
  }

  if (error) {
    console.error("PASSWORD_RECOVERY_REQUEST_FAILED", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
  }

  // Keep the response intentionally identical for registered and unknown e-mails.
  redirect("/recuperar-senha?enviado=1");
}
