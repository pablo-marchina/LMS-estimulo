import { AppShell } from "@/components/app-shell";
import { requireParticipantContext } from "@/lib/auth/participant-context";

export const dynamic = "force-dynamic";

export default async function CapacityLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireParticipantContext();
  return <AppShell area="empreendedor" email={auth.email}>{children}</AppShell>;
}
