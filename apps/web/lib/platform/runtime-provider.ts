import "server-only";
import {
  assertPlatformRuntimePolicyFor,
  normalizeApplicationEnvironment,
} from "./runtime-provider-core.mjs";

export type PlatformRuntimeProvider = "supabase" | "aws";
export const awsArchitectureStatus = "decision_pending" as const;

export function applicationEnvironment(): string {
  return normalizeApplicationEnvironment(process.env.APP_ENV);
}

export function platformRuntimeProvider(): PlatformRuntimeProvider {
  return assertPlatformRuntimePolicyFor(
    process.env.APP_ENV,
    process.env.PLATFORM_RUNTIME_PROVIDER,
  ) as PlatformRuntimeProvider;
}

export function assertPlatformRuntimePolicy(): PlatformRuntimeProvider {
  return platformRuntimeProvider();
}

// Only requirements implied by the Lambda container itself may live here.
// Identity, database, storage, edge, networking, queues and observability remain
// undecided and must be introduced by an approved architecture decision.
export const awsRuntimeRequiredEnvironment = [
  "AWS_REGION",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
] as const;

export function missingAwsRuntimeEnvironment(): string[] {
  return awsRuntimeRequiredEnvironment.filter((name) => !process.env[name]?.trim());
}
