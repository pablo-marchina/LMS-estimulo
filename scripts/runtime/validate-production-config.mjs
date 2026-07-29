import {
  assertPlatformRuntimePolicyFor,
  normalizeApplicationEnvironment,
} from "../../apps/web/lib/platform/runtime-provider-core.mjs";
import { loadRepositoryEnvironment } from "./load-root-env.mjs";

loadRepositoryEnvironment();

const environment = normalizeApplicationEnvironment(process.env.APP_ENV);
const provider = assertPlatformRuntimePolicyFor(
  environment,
  process.env.PLATFORM_RUNTIME_PROVIDER,
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`BUILD_CONFIGURATION_MISSING:${name}`);
  return value;
}

function validatedUrl(name, { allowLocal }) {
  const url = new URL(required(name));
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

function validateBase64Key(name) {
  const value = required(name);
  const decoded = Buffer.from(value, "base64");
  const canonical = decoded.toString("base64").replace(/=+$/u, "");
  if (decoded.length !== 32 || canonical !== value.replace(/=+$/u, "")) {
    throw new Error(`BUILD_SECRET_INVALID:${name}`);
  }
}

const allowLocal = environment === "development" || environment === "test";
const appUrl = validatedUrl("NEXT_PUBLIC_APP_URL", { allowLocal });
if (appUrl.pathname !== "/" && appUrl.pathname !== "") {
  throw new Error("BUILD_URL_INVALID:NEXT_PUBLIC_APP_URL_PATH");
}

if (provider === "supabase") {
  validatedUrl("NEXT_PUBLIC_SUPABASE_URL", { allowLocal });
  if (required("NEXT_PUBLIC_SUPABASE_ANON_KEY").length < 20) {
    throw new Error("BUILD_PUBLIC_KEY_INVALID:NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (required("SUPABASE_SERVICE_ROLE_KEY").length < 20) {
    throw new Error("BUILD_SECRET_INVALID:SUPABASE_SERVICE_ROLE_KEY");
  }
  validateBase64Key("CPF_ENCRYPTION_KEY");
  validateBase64Key("CPF_LOOKUP_HMAC_KEY");
  if (process.env.CPF_ENCRYPTION_KEY.trim() === process.env.CPF_LOOKUP_HMAC_KEY.trim()) {
    throw new Error("BUILD_SECRET_REUSE_FORBIDDEN:CPF_KEYS");
  }
  process.stdout.write(`[build-config] Supabase ${environment} configuration is valid\n`);
} else {
  if (allowLocal) throw new Error("AWS_BUILD_REQUIRES_DEPLOYED_ENVIRONMENT");
  process.stdout.write(`[build-config] AWS ${environment} public build configuration is valid\n`);
}
