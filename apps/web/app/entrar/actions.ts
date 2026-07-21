"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { testPublicSignupEnabled } from "@/lib/auth/test-public-signup";
import { provisionTestSignupParticipant } from "@/lib/auth/test-public-signup-provisioning";

function administrativeOrganization(auth: Extract<Awaited<ReturnType<typeof getAuthContext>>, { status: "authenticated" }>) {
  return auth.identity.organizations.find((item) => item.permissions.some((permission) => [
    "journey.execution.read",
    "journey.execution.manage",
    "participant.manage",
    "engagement.manage",
    "diagnostic.configuration.manage",
    "iam.memberships.manage",
  ].includes(permission)));
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/entrar?erro=campos_obrigatorios");

  const client = await createSessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/entrar?erro=credenciais_invalidas");
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=identidade_nao_vinculada");

  if (isEstimuloAdministrativeEmail(auth.email)) {
    const organization = administrativeOrganization(auth);
    if (organization) redirect(`/admin?organization=${organization.organization_id}`);
    redirect("/entrar?erro=permissao_administrativa_necessaria");
  }

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
        redirect("/entrar?erro=cadastro_incompleto");
      }
      redirect("/empreendedor");
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
