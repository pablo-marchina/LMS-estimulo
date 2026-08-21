import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { IdempotentSubmitBoundary } from "@/components/idempotent-submit-guard";
import { ParticipantShell } from "@/components/participant-shell";

export function AppShell({
  area,
  email,
  children,
  participantHasB2B = false,
  participantHasLibrary = false,
}: {
  area: "empreendedor" | "admin";
  email: string;
  children: ReactNode;
  participantHasB2B?: boolean;
  participantHasLibrary?: boolean;
}) {
  return (
    <IdempotentSubmitBoundary>
      {area === "admin"
        ? <AdminShell email={email}>{children}</AdminShell>
        : <ParticipantShell email={email} hasB2BAccess={participantHasB2B} hasLibraryContent={participantHasLibrary}>{children}</ParticipantShell>}
    </IdempotentSubmitBoundary>
  );
}
