import {
  assertPlatformRuntimePolicyFor,
  normalizeApplicationEnvironment,
} from "../../apps/web/lib/platform/runtime-provider-core.mjs";

const requiredSupabaseEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
];

function value(environmentVariables, name) {
  return String(environmentVariables[name] ?? "").trim();
}

function required(environmentVariables, name) {
  const configured = value(environmentVariables, name);
  if (!configured) throw new Error(`BUILD_CONFIGURATION_MISSING:${name}`);
  return configured;
}

function validatedUrl(environmentVariables, name, { allowLocal }) {
  const url = new URL(required(environmentVariables, name));
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (local) {
    if (!allowLocal || !["http:", "https:"].includes(url.protocol)) {
      throw new Error(`BUILD_URL_INVALID:${name}`);
    }
  } else if (url.protocol !== "https:") {
    throw new Error(`BUILD_URL_INVALID:${name}`);
  }
  return url;
}

function validateBase64Key(environmentVariables, name) {
  const configured = required(environmentVariables, name);
  const decoded = Buffer.from(configured, "base64");
  const canonical = decoded.toString("base64").replace(/=+$/u, "");
  if (decoded.length !== 32 || canonical !== configured.replace(/=+$/u, "")) {
    throw new Error(`BUILD_SECRET_INVALID:${name}`);
  }
}

export function validateProductionConfiguration(environmentVariables) {
  const environment = normalizeApplicationEnvironment(environmentVariables.APP_ENV);
  const provider = assertPlatformRuntimePolicyFor(
    environment,
    environmentVariables.PLATFORM_RUNTIME_PROVIDER,
  );
  const allowLocal = environment === "development" || environment === "test";
  const appUrl = validatedUrl(environmentVariables, "NEXT_PUBLIC_APP_URL", { allowLocal });

  if (appUrl.pathname !== "/" && appUrl.pathname !== "") {
    throw new Error("BUILD_URL_INVALID:NEXT_PUBLIC_APP_URL_PATH");
  }

  if (provider === "supabase") {
    const missing = requiredSupabaseEnvironment.filter(
      (name) => !value(environmentVariables, name),
    );
    const vercelEnvironment = value(environmentVariables, "VERCEL_ENV").toLowerCase();

    if (vercelEnvironment === "preview" && missing.length > 0) {
      return {
        environment,
        provider,
        level: "warning",
        message:
          `[build-config] Supabase preview configuration is incomplete (${missing.join(", ")}); `
          + "the build is allowed fail-closed and /api/health/ready must remain 503",
      };
    }

    validatedUrl(environmentVariables, "NEXT_PUBLIC_SUPABASE_URL", { allowLocal });
    if (required(environmentVariables, "NEXT_PUBLIC_SUPABASE_ANON_KEY").length < 20) {
      throw new Error("BUILD_PUBLIC_KEY_INVALID:NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    if (required(environmentVariables, "SUPABASE_SERVICE_ROLE_KEY").length < 20) {
      throw new Error("BUILD_SECRET_INVALID:SUPABASE_SERVICE_ROLE_KEY");
    }
    validateBase64Key(environmentVariables, "CPF_ENCRYPTION_KEY");
    validateBase64Key(environmentVariables, "CPF_LOOKUP_HMAC_KEY");
    if (
      value(environmentVariables, "CPF_ENCRYPTION_KEY")
      === value(environmentVariables, "CPF_LOOKUP_HMAC_KEY")
    ) {
      throw new Error("BUILD_SECRET_REUSE_FORBIDDEN:CPF_KEYS");
    }

    return {
      environment,
      provider,
      level: "info",
      message: `[build-config] Supabase ${environment} configuration is valid`,
    };
  }

  if (allowLocal) throw new Error("AWS_BUILD_REQUIRES_DEPLOYED_ENVIRONMENT");
  return {
    environment,
    provider,
    level: "info",
    message: `[build-config] AWS ${environment} public build configuration is valid`,
  };
}
