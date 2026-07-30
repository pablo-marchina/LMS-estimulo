import { NextResponse, type NextRequest } from "next/server";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { CurrentIdentityError, resolveCurrentIdentity } from "@/lib/auth/current-identity";
import { isGoogleAuthProvider } from "@/lib/auth/provider";
import { createSessionClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");
  if (!code || providerError) return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");

  const client = await createSessionClient();
  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");

  const [{ data, error: userError }, { data: claimsData, error: claimsError }] = await Promise.all([
    client.auth.getUser(),
    client.auth.getClaims(),
  ]);
  const user = data.user;
  if (
    userError
    || claimsError
    || !user
    || !claimsData?.claims
    || !user.email_confirmed_at
    || !isGoogleAuthProvider(user, claimsData.claims.amr)
  ) {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=conta_google_necessaria");
  }

  try {
    const identity = await resolveCurrentIdentity(client);
    const organization = administrativeOrganization(identity);
    if (!organization) {
      await client.auth.signOut();
      return redirectTo(request, "/entrar/administracao?erro=permissao_necessaria");
    }
    return redirectTo(request, `/admin?organization=${encodeURIComponent(organization.organization_id)}`);
  } catch (error) {
    await client.auth.signOut();
    if (error instanceof CurrentIdentityError && error.message.includes("identity_link_required")) {
      return redirectTo(request, "/entrar/administracao?erro=identidade_desvinculada");
    }
    return redirectTo(request, "/entrar/administracao?erro=oauth_invalido");
  }
}
