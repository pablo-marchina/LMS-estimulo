"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { resolveAuthenticatedDestination, sanitizeReturnTo } from "@/lib/auth/navigation.js";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { provisionTestSignupParticipant } from "@/lib/auth/test-public-signup-provisioning";

function signInErrorPath(error: string, returnTo: string | null): string {
  const search = new URLSearchParams({ erro: error });
  if (returnTo) search.set("returnTo", returnTo);
  return `/entrar?${search.toString()}`;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") ?? ""));
  if (!email || !password) redirect(signInErrorPath("campos_obrigatorios", returnTo));

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect(signInErrorPath("credenciais_invalidas", returnTo));
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect(signInErrorPath("identidade_nao_vinculada", returnTo));

  if (!auth.identity.entrepreneur_id && testPublicSignupEnabled()) {
    const { data } = await client.auth.getUser();
    const testSignup = data.user?.user_metadata?.test_public_signup === true;
    if (testSignup) {
      const preferredName = String(data.user?.user_metadata?.preferred_name ?? email.split("@")[0]).trim();
      try {
        await provisionTestSignupParticipant({
          userAccountId: auth.identity.user_account_id,
          email,
          preferredName
        });
      } catch {
        redirect(signInErrorPath("cadastro_incompleto", returnTo));
      }

      const refreshedAuth = await getAuthContext();
      if (refreshedAuth.status === "authenticated") {
        const destination = resolveAuthenticatedDestination(refreshedAuth.identity, returnTo);
        if (destination) redirect(destination);
      }
      redirect("/empreendedor");
    }
  }

  const destination = resolveAuthenticatedDestination(auth.identity, returnTo);
  if (destination) redirect(destination);
  redirect(signInErrorPath("acesso_nao_autorizado", returnTo));
}

export async function signOutAction() {
  const client = await createSessionClient();
  await client.auth.signOut();
  redirect("/entrar");
}
