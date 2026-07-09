"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/entrar?erro=credenciais_invalidas");
  redirect("/empreendedor");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
