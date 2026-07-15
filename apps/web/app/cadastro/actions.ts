"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { assertTestPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { provisionTestSignupParticipant } from "@/lib/auth/test-public-signup-provisioning";
import { createPrivilegedClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signUpAction(formData: FormData) {
  try {
    assertTestPublicSignupEnabled();
  } catch {
    redirect("/entrar?erro=cadastro_indisponivel");
  }

  const preferredName = String(formData.get("preferred_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (!preferredName || !email || !password || !passwordConfirmation) redirect("/cadastro?erro=campos_obrigatorios");
  if (!validEmail(email)) redirect("/cadastro?erro=email_invalido");
  if (password.length < 10) redirect("/cadastro?erro=senha_curta");
  if (password !== passwordConfirmation) redirect("/cadastro?erro=senhas_diferentes");

  const admin = createPrivilegedClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      preferred_name: preferredName,
      test_public_signup: true
    }
  });

  if (createError || !created.user) {
    const code = String(createError?.code ?? "").toLowerCase();
    const message = String(createError?.message ?? "").toLowerCase();
    if (code.includes("email") || message.includes("already") || message.includes("registered")) {
      redirect("/cadastro?erro=usuario_existente");
    }
    redirect("/cadastro?erro=criacao_falhou");
  }

  const session = await createSessionClient();
  const { error: signInError } = await session.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/cadastro?erro=autenticacao_falhou");

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/cadastro?erro=provisionamento_falhou");

  try {
    await provisionTestSignupParticipant({
      userAccountId: auth.identity.user_account_id,
      email,
      preferredName
    });
  } catch {
    redirect("/cadastro?erro=provisionamento_falhou");
  }

  redirect("/empreendedor");
}
