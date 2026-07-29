export type RuntimeProviderValue = "supabase" | "aws";

export function normalizeApplicationEnvironment(value: unknown): string;
export function parsePlatformRuntimeProvider(value: unknown): RuntimeProviderValue;
export function assertPlatformRuntimePolicyFor(
  environmentValue: unknown,
  providerValue: unknown,
): RuntimeProviderValue;
