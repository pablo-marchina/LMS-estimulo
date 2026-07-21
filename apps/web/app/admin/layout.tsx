import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar/administracao?erro=oauth_invalido");
  }
  if (auth.provider !== "google" || !isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/entrar/administracao?erro=conta_google_necessaria");
  }
  if (!administrativeOrganization(auth.identity)) {
    redirect("/entrar/administracao?erro=permissao_necessaria");
  }
  return children;
}
