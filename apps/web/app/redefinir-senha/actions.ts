"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";

const passwordSchema = z.object({
  password: z.string().min(10).max(128),
  passwordConfirmation: z.string(),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "PASSWORDS_DIFFER",
});

export async function updateRecoveredPasswordAction(formData: FormData) {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("password_confirmation"),
  });

  if (!parsed.success) {
    const passwordsDiffer = parsed.error.issues.some((issue) => issue.message === "PASSWORDS_DIFFER");
    redirect(`/redefinir-senha?erro=${passwordsDiffer ? "senhas_diferentes" : "senha_invalida"}`);
  }

  const client = await createSessionClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) redirect("/recuperar-senha?erro=link_invalido");

  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("PASSWORD_RECOVERY_UPDATE_FAILED", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirect("/redefinir-senha?erro=atualizacao_falhou");
  }

  await client.auth.signOut({ scope: "local" });
  redirect("/entrar?senha=alterada");
}
