import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status === "anonymous") redirect("/entrar");
  if (auth.status === "identity_error") redirect("/entrar?erro=identidade_nao_vinculada");
  if (!auth.identity.entrepreneur_id) redirect("/cadastro/concluir");
  return <AppShell area="empreendedor" email={auth.email}>{children}</AppShell>;
}
