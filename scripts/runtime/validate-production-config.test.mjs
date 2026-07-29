import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionConfiguration } from "./validate-production-config-core.mjs";

const firstCpfKey = Buffer.alloc(32, 1).toString("base64");
const secondCpfKey = Buffer.alloc(32, 2).toString("base64");

function completeSupabaseEnvironment(overrides = {}) {
  return {
    APP_ENV: "development",
    PLATFORM_RUNTIME_PROVIDER: "supabase",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "abcdefghijklmnopqrstuvwxyz",
    SUPABASE_SERVICE_ROLE_KEY: "abcdefghijklmnopqrstuvwxyz123456",
    CPF_ENCRYPTION_KEY: firstCpfKey,
    CPF_LOOKUP_HMAC_KEY: secondCpfKey,
    ...overrides,
  };
}

test("accepts a complete local Supabase configuration", () => {
  const result = validateProductionConfiguration(completeSupabaseEnvironment());
  assert.equal(result.provider, "supabase");
  assert.equal(result.level, "info");
  assert.match(result.message, /configuration is valid/);
});

test("allows an incomplete Vercel preview to build fail closed", () => {
  const result = validateProductionConfiguration({
    APP_ENV: "development",
    PLATFORM_RUNTIME_PROVIDER: "supabase",
    NEXT_PUBLIC_APP_URL: "https://preview.example.org",
    VERCEL_ENV: "preview",
  });

  assert.equal(result.provider, "supabase");
  assert.equal(result.level, "warning");
  assert.match(result.message, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(result.message, /health\/ready must remain 503/);
});

test("keeps missing Supabase configuration fatal outside Vercel preview", () => {
  assert.throws(
    () => validateProductionConfiguration({
      APP_ENV: "development",
      PLATFORM_RUNTIME_PROVIDER: "supabase",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    }),
    /BUILD_CONFIGURATION_MISSING:NEXT_PUBLIC_SUPABASE_URL/,
  );
});

test("keeps Supabase forbidden in production", () => {
  assert.throws(
    () => validateProductionConfiguration(completeSupabaseEnvironment({
      APP_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://app.example.org",
      VERCEL_ENV: "production",
    })),
    /DEPLOYED_ENVIRONMENT_REQUIRES_AWS_RUNTIME/,
  );
});

test("accepts the AWS production public build contract", () => {
  const result = validateProductionConfiguration({
    APP_ENV: "production",
    PLATFORM_RUNTIME_PROVIDER: "aws",
    NEXT_PUBLIC_APP_URL: "https://app.example.org",
  });

  assert.equal(result.provider, "aws");
  assert.equal(result.level, "info");
});
