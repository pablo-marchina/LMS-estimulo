import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthContext } from "@/lib/auth/context";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar?erro=confirmacao_necessaria");
  }
  if (!isEstimuloAdministrativeEmail(auth.email)) {
    redirect("/empreendedor?erro=email_administrativo_necessario");
  }
  return children;
}
