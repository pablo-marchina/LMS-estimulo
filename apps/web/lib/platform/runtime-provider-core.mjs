const supportedProviders = new Set(["supabase", "aws"]);
const awsOnlyEnvironments = new Set(["staging", "production"]);

export function normalizeApplicationEnvironment(value) {
  return String(value ?? "development").trim().toLowerCase() || "development";
}

export function parsePlatformRuntimeProvider(value) {
  const provider = String(value ?? "supabase").trim().toLowerCase() || "supabase";
  if (!supportedProviders.has(provider)) {
    throw new Error(`PLATFORM_RUNTIME_PROVIDER_INVALID:${provider}`);
  }
  return provider;
}

export function assertPlatformRuntimePolicyFor(environmentValue, providerValue) {
  const environment = normalizeApplicationEnvironment(environmentValue);
  const provider = parsePlatformRuntimeProvider(providerValue);

  if (awsOnlyEnvironments.has(environment) && provider !== "aws") {
    throw new Error("DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME");
  }

  return provider;
}
