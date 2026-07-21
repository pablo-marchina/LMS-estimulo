type AuthProviderSource = {
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<{ provider?: string | null }> | null;
};

export function resolveAuthProvider(source: AuthProviderSource): string {
  const primary = source.app_metadata?.provider;
  if (typeof primary === "string" && primary.trim()) return primary.trim().toLowerCase();

  const providers = source.app_metadata?.providers;
  if (Array.isArray(providers)) {
    const first = providers.find((provider): provider is string => typeof provider === "string" && provider.trim().length > 0);
    if (first) return first.trim().toLowerCase();
  }

  const identity = source.identities?.find((item) => typeof item.provider === "string" && item.provider.trim().length > 0);
  return identity?.provider?.trim().toLowerCase() ?? "supabase";
}

export function isGoogleAuthProvider(source: AuthProviderSource): boolean {
  if (resolveAuthProvider(source) === "google") return true;
  return source.identities?.some((identity) => identity.provider?.trim().toLowerCase() === "google") ?? false;
}
