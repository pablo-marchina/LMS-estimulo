import type { ReactNode } from "react";
import { AdminShellBoundary } from "@/components/admin-shell";
import { IdempotentSubmitBoundary } from "@/components/idempotent-submit-guard";
import { ParticipantShell } from "@/components/participant-shell";

export function AppShell({
  area,
  email,
  children,
  participantHasB2B = false,
}: {
  area: "empreendedor" | "admin";
  email: string;
  children: ReactNode;
  participantHasB2B?: boolean;
}) {
  return (
    <IdempotentSubmitBoundary>
      {area === "admin"
        ? <AdminShellBoundary email={email}>{children}</AdminShellBoundary>
        : <ParticipantShell email={email} hasB2BAccess={participantHasB2B}>{children}</ParticipantShell>}
    </IdempotentSubmitBoundary>
  );
}
