import "server-only";
import {
  assertPlatformRuntimePolicyFor,
  normalizeApplicationEnvironment,
  parsePlatformRuntimeProvider,
} from "./runtime-provider-core.mjs";

export type PlatformRuntimeProvider = "supabase" | "aws";

export function applicationEnvironment(): string {
  return normalizeApplicationEnvironment(process.env.APP_ENV);
}

export function platformRuntimeProvider(): PlatformRuntimeProvider {
  return parsePlatformRuntimeProvider(process.env.PLATFORM_RUNTIME_PROVIDER) as PlatformRuntimeProvider;
}

export function assertPlatformRuntimePolicy(): PlatformRuntimeProvider {
  return assertPlatformRuntimePolicyFor(
    process.env.APP_ENV,
    process.env.PLATFORM_RUNTIME_PROVIDER,
  ) as PlatformRuntimeProvider;
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
