import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { getAuthContext } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") {
    redirect("/entrar/administracao?erro=oauth_invalido");
  }

  // Entering /admin only requires a valid Estímulo organization membership.
  // Every privileged operation must still authorize its own capability server-side.
  if (!administrativeOrganization(auth.identity)) {
    redirect("/entrar/administracao?erro=vinculo_estimulo_necessario");
  }

  return <>{children}</>;
}
