import "server-only";
import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/auth/context";
import type { CurrentIdentityContext } from "@/lib/auth/current-identity";

type AuthenticatedContext = Extract<AuthContext, { status: "authenticated" }>;

export type ParticipantAuthContext = AuthenticatedContext & {
  identity: CurrentIdentityContext & { entrepreneur_id: string; access_mode: "participant" };
};

export async function requireParticipantContext(): Promise<ParticipantAuthContext> {
  const auth = await getAuthContext();

  if (auth.status === "anonymous") redirect("/entrar");
  if (auth.status === "identity_error") redirect("/entrar?erro=identidade_nao_vinculada");

  if (auth.identity.access_mode === "administrative") {
    redirect(auth.identity.next_path || "/admin");
  }

  if (auth.identity.access_mode === "onboarding_required" || !auth.identity.entrepreneur_id) {
    redirect(auth.identity.next_path || "/cadastro/concluir?retorno=perfil_incompleto");
  }

  return auth as ParticipantAuthContext;
}
