type AuthIdentity = {
  provider?: string | null;
  last_sign_in_at?: string | null;
};

type AuthProviderSource = {
  app_metadata?: Record<string, unknown> | null;
  identities?: AuthIdentity[] | null;
};

type AuthenticationMethod = {
  method?: string | null;
  timestamp?: number | null;
};

function authenticationMethods(amr: unknown): Set<string> {
  if (!Array.isArray(amr)) return new Set();
  return new Set(
    amr
      .map((entry) => (entry && typeof entry === "object" ? (entry as AuthenticationMethod).method : null))
      .filter((method): method is string => typeof method === "string" && method.trim().length > 0)
      .map((method) => method.trim().toLowerCase())
  );
}

function identityTimestamp(identity: AuthIdentity): number {
  if (!identity.last_sign_in_at) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(identity.last_sign_in_at);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function mostRecentlyUsedOAuthProvider(source: AuthProviderSource): string | null {
  const identity = [...(source.identities ?? [])]
    .filter((item) => {
      const provider = item.provider?.trim().toLowerCase();
      return provider && provider !== "email" && provider !== "phone";
    })
    .sort((left, right) => identityTimestamp(right) - identityTimestamp(left))[0];
  return identity?.provider?.trim().toLowerCase() ?? null;
}

function firstConfiguredProvider(source: AuthProviderSource): string {
  const primary = source.app_metadata?.provider;
  if (typeof primary === "string" && primary.trim()) return primary.trim().toLowerCase();

  const providers = source.app_metadata?.providers;
  if (Array.isArray(providers)) {
    const first = providers.find((provider): provider is string => typeof provider === "string" && provider.trim().length > 0);
    if (first) return first.trim().toLowerCase();
  }

  return "supabase";
}

export function resolveAuthProvider(source: AuthProviderSource, amr?: unknown): string {
  const methods = authenticationMethods(amr);

  if (methods.has("oauth")) {
    return mostRecentlyUsedOAuthProvider(source) ?? "oauth";
  }
  if (methods.has("password") || methods.has("email/signup") || methods.has("magiclink") || methods.has("otp")) {
    return "email";
  }
  if (methods.has("sso/saml")) return "sso/saml";

  return firstConfiguredProvider(source);
}

export function isGoogleAuthProvider(source: AuthProviderSource, amr?: unknown): boolean {
  return authenticationMethods(amr).has("oauth") && resolveAuthProvider(source, amr) === "google";
}
