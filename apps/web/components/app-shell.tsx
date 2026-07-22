import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { IdempotentSubmitBoundary } from "@/components/idempotent-submit-guard";
import { ParticipantShell } from "@/components/participant-shell";

export function AppShell({ area, email, children }: { area: "empreendedor" | "admin"; email: string; children: ReactNode }) {
  return (
    <IdempotentSubmitBoundary>
      {area === "admin" ? <AdminShell email={email}>{children}</AdminShell> : <ParticipantShell email={email}>{children}</ParticipantShell>}
    </IdempotentSubmitBoundary>
  );
}
