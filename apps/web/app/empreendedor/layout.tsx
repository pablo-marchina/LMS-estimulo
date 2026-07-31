import { AppShell } from "@/components/app-shell";
import { LegalReacceptanceGate } from "@/components/legal-reacceptance-gate";
import { requireParticipantContext } from "@/lib/auth/participant-context";
import { extensionsRuntime } from "@/lib/extensions/runtime";

export const dynamic = "force-dynamic";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireParticipantContext();
  const extensions = await extensionsRuntime.participantWorkspace(auth.identity.user_account_id).catch(() => null);
  return (
    <AppShell area="empreendedor" email={auth.email}>
      {children}
      <LegalReacceptanceGate documents={extensions?.pending_legal_documents ?? []} />
    </AppShell>
  );
}
