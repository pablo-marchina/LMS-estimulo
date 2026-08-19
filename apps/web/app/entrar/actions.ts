"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveCurrentIdentity } from "@/lib/auth/current-identity";
import { extensionsRuntime } from "@/lib/extensions/runtime";
import { clearSupabaseSessionCookies, createSessionClient } from "@/lib/supabase/server";

function safeDestination(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin") ? value : null;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");

  // A stale/rotated refresh token can otherwise race the explicit password
  // sign-in and momentarily surface an auth error even when the credentials
  // are valid. A new login must always start from a clean local auth session.
  await clearSupabaseSessionCookies();
  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") redirect("/entrar?erro=confirmacao_necessaria");
  if (error) redirect("/entrar?erro=credenciais_invalidas");

  // Resolve the internal identity with the exact Supabase client that just
  // authenticated. Re-reading a cached request auth context here can observe
  // the pre-login state before the newly issued session cookies are reflected.
  let identity = null;
  try {
    identity = await resolveCurrentIdentity(client);
  } catch (error) {
    console.error("LOGIN_IDENTITY_RESOLUTION_FAILED", {
      error_name: error instanceof Error ? error.name : "unknown",
    });
  }
  if (!identity) {
    await client.auth.signOut();
    redirect("/entrar?erro=identidade_nao_vinculada");
  }

  const cookieStore = await cookies();
  const trackingToken = cookieStore.get("estimulo_tracking_visit")?.value;
  let trackedDestination: string | null = null;
  if (trackingToken) {
    try {
      const result = await extensionsRuntime.performParticipant({
        actorUserAccountId: identity.user_account_id,
        action: "tracking_associate",
        payload: { visit_token: trackingToken },
        idempotencyKey: `tracking-login:${randomUUID()}`,
      });
      trackedDestination = safeDestination(result.destination_path);
    } catch {
      trackedDestination = null;
    }
    cookieStore.delete("estimulo_tracking_visit");
  }
  if (trackedDestination) redirect(trackedDestination);

  if (identity.entrepreneur_id) redirect("/empreendedor");
  redirect("/cadastro/concluir");
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  await clearSupabaseSessionCookies();
  redirect("/entrar");
}
