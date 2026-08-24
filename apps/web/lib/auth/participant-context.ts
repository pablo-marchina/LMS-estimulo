import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContext, type AuthContext } from "@/lib/auth/context";
import type { CurrentIdentityContext } from "@/lib/auth/current-identity";
import { INTERFACE_PREVIEW_REQUEST_HEADER } from "@/lib/interface-preview/constants";

type AuthenticatedContext = Extract<AuthContext, { status: "authenticated" }>;

export type ParticipantAuthContext = AuthenticatedContext & {
  identity: CurrentIdentityContext & { entrepreneur_id: string; access_mode: "participant" };
};

function isTransientIdentityFailure(reason: string): boolean {
  return reason.startsWith("RPC_GATEWAY_");
}

export async function isParticipantInterfacePreviewRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return requestHeaders.get(INTERFACE_PREVIEW_REQUEST_HEADER) === "1";
}

/**
 * Participant interface preview is intentionally read-only. The preview resolves
 * a real participant identity for accurate rendering, so every participant
 * mutation must reject requests carrying the trusted preview marker before
 * writing state for that participant.
 */
export async function assertParticipantMutationAllowed(): Promise<void> {
  if (await isParticipantInterfacePreviewRequest()) {
    throw new Error("INTERFACE_PREVIEW_READ_ONLY");
  }
}

export async function requireParticipantContext(): Promise<ParticipantAuthContext> {
  const auth = await getAuthContext();

  if (auth.status === "anonymous") redirect("/entrar");
  if (auth.status === "identity_error") {
    if (isTransientIdentityFailure(auth.reason)) {
      console.error("PARTICIPANT_IDENTITY_TEMPORARILY_UNAVAILABLE", { reason: auth.reason });
      throw new Error("PARTICIPANT_IDENTITY_TEMPORARILY_UNAVAILABLE");
    }
    redirect("/entrar?erro=identidade_nao_vinculada");
  }

  if (auth.identity.access_mode === "administrative") {
    redirect(auth.identity.next_path || "/admin");
  }

  if (auth.identity.access_mode === "onboarding_required" || !auth.identity.entrepreneur_id) {
    redirect(auth.identity.next_path || "/cadastro/concluir?retorno=perfil_incompleto");
  }

  return auth as ParticipantAuthContext;
}
