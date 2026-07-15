import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function CapacityLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status === "anonymous") return <StatusPanel title="Sessão necessária" tone="warning"><p>Entre novamente para acessar a biblioteca.</p></StatusPanel>;
  if (auth.status === "identity_error") return <main className="page-container"><StatusPanel title="Identidade ainda não vinculada" tone="warning"><p>Seu acesso foi autenticado, mas ainda precisa ser reconciliado com o cadastro interno. Código: {auth.reason}</p></StatusPanel></main>;
  return <AppShell area="empreendedor" email={auth.email}>{children}</AppShell>;
}
