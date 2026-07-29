import { NextResponse, type NextRequest } from "next/server";
import { publicApplicationOrigin } from "@/lib/http-public-origin";
import { createSessionClient } from "@/lib/supabase/server";

function signInError(request: NextRequest) {
  return NextResponse.redirect(new URL("/entrar/administracao?erro=oauth_indisponivel", request.url));
}

export async function GET(request: NextRequest) {
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

  if (error || !data.url) return signInError(request);
  return NextResponse.redirect(data.url);
}
