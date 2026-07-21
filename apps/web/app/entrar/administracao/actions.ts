"use server";

import { redirect } from "next/navigation";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

export async function signInWithGoogleAction() {
  const client = await createSessionClient();
  await client.auth.signOut();

  const callback = new URL("/auth/admin/callback", publicApplicationOrigin()).toString();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
      skipBrowserRedirect: true,
      queryParams: {
        hd: "estimulo.org",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) redirect("/entrar/administracao?erro=oauth_indisponivel");
  redirect(data.url);
}
