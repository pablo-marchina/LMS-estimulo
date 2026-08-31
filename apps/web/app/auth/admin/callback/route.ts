import { NextResponse, type NextRequest } from "next/server";
import { administrativeOrganization } from "@/lib/auth/administrative-access";
import { CurrentIdentityError, resolveCurrentIdentity } from "@/lib/auth/current-identity";
import { createSessionClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

function hasGoogleIdentity(user: {
  identities?: Array<{ provider?: string | null }> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  if (user.identities?.some((identity) => identity.provider?.trim().toLowerCase() === "google")) return true;

  const primaryProvider = user.app_metadata?.provider;
  if (typeof primaryProvider === "string" && primaryProvider.trim().toLowerCase() === "google") return true;

  const providers = user.app_metadata?.providers;
  return Array.isArray(providers)
    && providers.some((provider) => typeof provider === "string" && provider.trim().toLowerCase() === "google");
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
  if (
    userError
    || !user
    || !user.email
    || !user.email_confirmed_at
    || !hasGoogleIdentity(user)
  ) {
    await client.auth.signOut();
    return redirectTo(request, "/entrar/administracao?erro=conta_google_necessaria");
  }

  try {
    const identity = await resolveCurrentIdentity(client);
    const organization = administrativeOrganization(identity);
    if (!organization) {
      await client.auth.signOut();
      return redirectTo(request, "/entrar/administracao?erro=vinculo_estimulo_necessario");
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
