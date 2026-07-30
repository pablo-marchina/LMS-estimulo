"use server";

import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { createSessionClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") redirect("/entrar?erro=confirmacao_necessaria");
  if (error) redirect("/entrar?erro=credenciais_invalidas");

  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=identidade_nao_vinculada");

  if (auth.identity.entrepreneur_id) redirect("/empreendedor");
  const organization = administrativeOrganization(auth.identity);
  if (organization) redirect(`/admin?organization=${encodeURIComponent(organization.organization_id)}`);
  redirect("/cadastro/concluir");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
