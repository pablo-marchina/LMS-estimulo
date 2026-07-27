const production = process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";

if (!production) {
  console.log("Production runtime validation skipped outside production.");
  process.exit(0);
}

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CPF_ENCRYPTION_KEY",
  "CPF_LOOKUP_HMAC_KEY",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`PRODUCTION_CONFIGURATION_MISSING:${missing.join(",")}`);
}

function validatedHttpsUrl(name) {
  const value = process.env[name].trim();
  const url = new URL(value);
  if (url.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`PRODUCTION_URL_INVALID:${name}`);
  }
  return url;
}

function validateBase64Key(name) {
  const value = process.env[name].trim();
  const decoded = Buffer.from(value, "base64");
  const canonical = decoded.toString("base64").replace(/=+$/u, "");
  if (decoded.length !== 32 || canonical !== value.replace(/=+$/u, "")) {
    throw new Error(`PRODUCTION_SECRET_INVALID:${name}`);
  }
}

const appUrl = validatedHttpsUrl("NEXT_PUBLIC_APP_URL");
const supabaseUrl = validatedHttpsUrl("NEXT_PUBLIC_SUPABASE_URL");
if (appUrl.pathname !== "/" && appUrl.pathname !== "") {
  throw new Error("PRODUCTION_URL_INVALID:NEXT_PUBLIC_APP_URL_PATH");
}
validateBase64Key("CPF_ENCRYPTION_KEY");
validateBase64Key("CPF_LOOKUP_HMAC_KEY");
if (process.env.CPF_ENCRYPTION_KEY.trim() === process.env.CPF_LOOKUP_HMAC_KEY.trim()) {
  throw new Error("PRODUCTION_SECRET_REUSE_FORBIDDEN:CPF_KEYS");
}

const requiredDatabaseChecks = [
  "identity_schema",
  "participant_schema",
  "journey_schema",
  "outbox_schema",
  "integration_schema",
  "cpf_protection_schema",
  "participant_phone",
  "business_cnpj",
  "public_signup_v3",
  "identity_recovery",
];

async function fetchReadiness() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const endpoint = new URL("/rest/v1/rpc/get_application_readiness", supabaseUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY.trim()}`,
        "content-type": "application/json",
      },
      body: "{}",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`PRODUCTION_DATABASE_READINESS_HTTP_${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

let lastError;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  try {
    const readiness = await fetchReadiness();
    const checks = readiness && typeof readiness === "object" ? readiness.checks : null;
    const failedChecks = requiredDatabaseChecks.filter((name) => checks?.[name] !== true);
    if (readiness?.status !== "ready" || failedChecks.length > 0) {
      throw new Error(`PRODUCTION_DATABASE_NOT_READY:${failedChecks.join(",") || "status"}`);
    }
    console.log("Production authentication and signup contracts are ready.");
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
}

throw lastError instanceof Error ? lastError : new Error("PRODUCTION_RUNTIME_VALIDATION_FAILED");
