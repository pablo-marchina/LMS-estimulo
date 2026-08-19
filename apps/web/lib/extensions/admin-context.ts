import "server-only";

import { redirect } from "next/navigation";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export async function requireAdminExtensionsWorkspace() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar/administracao?erro=acesso_nao_autorizado");
  }
  const organization = administrativeOrganization(auth.identity);
  if (!organization) redirect("/admin?erro=organizacao_indisponivel");
  const workspace = await extensionsRuntime.adminWorkspace(auth.identity.user_account_id, organization.organization_id);
  return { auth, organization, workspace };
}
