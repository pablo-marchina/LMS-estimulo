"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { createSessionClient } from "@/lib/supabase/server";

function safeDestination(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin") ? value : null;
}

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

  const cookieStore = await cookies();
  const trackingToken = cookieStore.get("estimulo_tracking_visit")?.value;
  if (trackingToken) {
    try {
      const result = await extensionsRuntime.performParticipant({
        actorUserAccountId: auth.identity.user_account_id,
        action: "tracking_associate",
        payload: { visit_token: trackingToken },
        idempotencyKey: `tracking-login:${randomUUID()}`,
      });
      cookieStore.delete("estimulo_tracking_visit");
      const destination = safeDestination(result.destination_path);
      if (destination) redirect(destination);
    } catch {
      cookieStore.delete("estimulo_tracking_visit");
    }
  }

  if (auth.identity.entrepreneur_id) redirect("/empreendedor");
  redirect("/cadastro/concluir");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
