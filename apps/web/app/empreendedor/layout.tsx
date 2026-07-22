import { AppShell } from "@/components/app-shell";
import { StatusPanel } from "@/components/status-panel";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status === "anonymous") return <main className="mx-auto max-w-2xl px-4 py-16"><StatusPanel title="Sessão necessária" tone="warning"><p>Entre novamente para acessar suas jornadas.</p></StatusPanel></main>;
  if (auth.status === "identity_error") return <main className="mx-auto max-w-2xl px-4 py-16"><StatusPanel title="Identidade ainda não vinculada" tone="warning"><p>Seu acesso foi autenticado, mas ainda precisa ser reconciliado com o cadastro interno. Código: {auth.reason}</p></StatusPanel></main>;
  return <AppShell area="empreendedor" email={auth.email}>{children}</AppShell>;
}
