"use server";

import { redirect } from "next/navigation";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { getAuthContext } from "@/lib/auth/context";
import { createSessionClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");
  if (isEstimuloAdministrativeEmail(email)) redirect("/entrar/administracao?erro=conta_google_necessaria");

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") redirect("/entrar?erro=confirmacao_necessaria");
  if (error) redirect("/entrar?erro=credenciais_invalidas");

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=identidade_nao_vinculada");

  if (isEstimuloAdministrativeEmail(auth.email)) {
    await client.auth.signOut();
    redirect("/entrar/administracao?erro=conta_google_necessaria");
  }

  if (auth.identity.entrepreneur_id) redirect("/empreendedor");
  redirect("/cadastro/concluir");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
