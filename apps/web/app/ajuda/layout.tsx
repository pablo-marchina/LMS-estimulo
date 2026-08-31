import { AppShell } from "@/components/app-shell";
import { getAuthContext } from "@/lib/auth/context";
import { participantShellRuntime } from "@/lib/extensions/participant-shell-runtime";

export const dynamic = "force-dynamic";

export default async function HelpLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthContext();

  if (auth.status !== "authenticated") {
    return <main id="conteudo-principal">{children}</main>;
  }

  if (auth.identity.access_mode === "administrative") {
    return (
      <AppShell area="admin" email={auth.email}>
        {children}
      </AppShell>
    );
  }

  if (auth.identity.access_mode === "participant" && auth.identity.entrepreneur_id) {
    const shellContext = await participantShellRuntime.get(auth.identity.user_account_id).catch(() => null);
    return (
      <AppShell
        area="empreendedor"
        email={auth.email}
        participantHasB2B={Boolean(shellContext?.has_b2b_access)}
      >
        {children}
      </AppShell>
    );
  }

  return <main id="conteudo-principal">{children}</main>;
}
