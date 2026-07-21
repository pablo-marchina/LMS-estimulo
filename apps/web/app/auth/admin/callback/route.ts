import { NextResponse, type NextRequest } from "next/server";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { isEstimuloAdministrativeEmail } from "@/lib/auth/administrative-email";
import { getAuthContext } from "@/lib/auth/context";
import { isGoogleAuthProvider } from "@/lib/auth/provider";
import { createSessionClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");
  if (!code || providerError) return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");

  const client = await createSessionClient();
  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");

  const { data, error: userError } = await client.auth.getUser();
  const user = data.user;
  if (userError || !user || !user.email_confirmed_at || !isGoogleAuthProvider(user)) {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=conta_google_necessaria");
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  if (!isEstimuloAdministrativeEmail(email)) {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=dominio_invalido");
  }

  const auth = await getAuthContext();
  if (auth.status !== "authenticated" || auth.provider !== "google") {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");
  }

  const organization = administrativeOrganization(auth.identity);
  if (!organization) {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=permissao_necessaria");
  }

  return redirectTo(request, `/admin?organization=${encodeURIComponent(organization.organization_id)}`);
}
