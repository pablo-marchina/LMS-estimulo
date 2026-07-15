import "server-only";

const ALLOWED_APP_ENVIRONMENTS = new Set(["development", "test"]);

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function testPublicSignupEnabled(): boolean {
  const appEnvironment = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "")
    .trim()
    .toLowerCase();

  return process.env.NODE_ENV !== "production"
    && ALLOWED_APP_ENVIRONMENTS.has(appEnvironment)
    && process.env.PUBLIC_SIGNUP_TEST_MODE?.trim().toLowerCase() === "true"
    && configured("NEXT_PUBLIC_SUPABASE_URL")
    && configured("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    && configured("SUPABASE_SERVICE_ROLE_KEY");
}

export function assertTestPublicSignupEnabled(): void {
  if (!testPublicSignupEnabled()) throw new Error("TEST_PUBLIC_SIGNUP_DISABLED");
}
