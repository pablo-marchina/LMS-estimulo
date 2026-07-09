"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/entrar?erro=credenciais_invalidas");
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=identidade_nao_vinculada");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");
  const organization = auth.identity.organizations.find((item) => item.permissions.includes("journey.execution.read") || item.permissions.includes("journey.execution.manage"));
  if (organization) redirect(`/admin?organization=${organization.organization_id}`);
  redirect("/entrar?erro=acesso_nao_autorizado");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
