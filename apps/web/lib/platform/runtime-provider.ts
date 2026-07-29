import "server-only";

export type PlatformRuntimeProvider = "supabase" | "aws";

const supportedProviders = new Set<PlatformRuntimeProvider>(["supabase", "aws"]);

export function applicationEnvironment(): string {
  return (process.env.APP_ENV ?? "development").trim().toLowerCase();
}

export function platformRuntimeProvider(): PlatformRuntimeProvider {
  const value = (process.env.PLATFORM_RUNTIME_PROVIDER ?? "supabase").trim().toLowerCase();
  if (!supportedProviders.has(value as PlatformRuntimeProvider)) {
    throw new Error(`PLATFORM_RUNTIME_PROVIDER_INVALID:${value || "empty"}`);
  }
  return value as PlatformRuntimeProvider;
}

export function assertPlatformRuntimePolicy(): PlatformRuntimeProvider {
  const environment = applicationEnvironment();
  const provider = platformRuntimeProvider();

  if (environment === "production" && provider !== "aws") {
    throw new Error("PRODUCTION_REQUIRES_AWS_RUNTIME");
  }

  return provider;
}

export const awsRuntimeRequiredEnvironment = [
  "AWS_REGION",
  "COGNITO_USER_POOL_ID",
  "COGNITO_APP_CLIENT_ID",
  "DATABASE_PROXY_ENDPOINT",
  "DATABASE_NAME",
  "PRACTICE_EVIDENCE_BUCKET",
  "LIBRARY_CONTENT_BUCKET",
  "CREDENTIAL_FILES_BUCKET",
  "CERTIFICATE_TEMPLATE_BUCKET",
  "ANNOUNCEMENT_BANNER_BUCKET",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
] as const;

export function missingAwsRuntimeEnvironment(): string[] {
  return awsRuntimeRequiredEnvironment.filter((name) => !process.env[name]?.trim());
}
