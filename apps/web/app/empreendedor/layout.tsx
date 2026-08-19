import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { BadgeAcquisitionPopup } from "@/components/badge-acquisition-popup";
import { LegalReacceptanceGate } from "@/components/legal-reacceptance-gate";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { credentialRuntime } from "@/lib/credentials/runtime";
import { participantShellRuntime } from "@/lib/extensions/participant-shell-runtime";

export default async function ParticipantLayout({ children }: { children: ReactNode }) {
  const auth = await requireParticipantContext();
  const [shellContext, credentials] = await Promise.all([
    participantShellRuntime.get(auth.identity.user_account_id).catch(() => null),
    credentialRuntime.listParticipant(auth.identity.user_account_id).catch(() => null),
  ]);

  return (
    <AppShell
      area="empreendedor"
      email={auth.email}
      participantHasB2B={Boolean(shellContext?.has_b2b_access)}
      participantHasLibrary={Boolean(shellContext?.has_library_content)}
    >
      <BadgeAcquisitionPopup badges={credentials?.badges ?? []} />
      {children}
      <LegalReacceptanceGate documents={shellContext?.pending_legal_documents ?? []} />
    </AppShell>
  );
}
