"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { publicApplicationOrigin } from "@/lib/http-public-origin";

const signupSchema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(320).transform((value: string) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  passwordConfirmation: z.string(),
  terms: z.literal("accepted"),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "PASSWORDS_DIFFER",
});

export async function createPublicAccountAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("password_confirmation"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((issue) => issue.message === "PASSWORDS_DIFFER");
    redirect(`/cadastro?erro=${passwordIssue ? "senhas_diferentes" : "dados_invalidos"}`);
  }

  const client = await createSessionClient();
  const callback = new URL("/auth/confirm", publicApplicationOrigin()).toString();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback,
      data: {
        preferred_name: parsed.data.preferredName,
        business_name: parsed.data.businessName || null,
        signup_profile_version: 1,
      },
    },
  });

  if (error) {
    const rateLimited = error.status === 429
      || error.code === "over_email_send_rate_limit"
      || error.code?.includes("rate_limit");
    const code = rateLimited
      ? "limite_email"
      : error.code === "user_already_exists" || error.code === "user_already_registered"
        ? "usuario_existente"
        : "criacao_falhou";
    redirect(`/cadastro?erro=${code}`);
  }
  if (data.session) redirect("/cadastro/concluir");
  redirect("/entrar?cadastro=confirmacao");
}
