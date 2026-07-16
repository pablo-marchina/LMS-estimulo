import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { defaultAuthenticatedDestination } from "@/lib/auth/navigation.js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar");

  const destination = defaultAuthenticatedDestination(auth.identity);
  if (destination) redirect(destination);
  redirect("/entrar?erro=acesso_nao_autorizado");
}
