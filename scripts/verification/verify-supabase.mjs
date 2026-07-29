import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPlatformRuntimePolicyFor,
  normalizeApplicationEnvironment,
} from "../../apps/web/lib/platform/runtime-provider-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) loadEnvFile(envPath);

const environment = normalizeApplicationEnvironment(process.env.APP_ENV);
const provider = assertPlatformRuntimePolicyFor(
  environment,
  process.env.PLATFORM_RUNTIME_PROVIDER,
);
if (provider !== "supabase") {
  throw new Error("SUPABASE_VERIFICATION_REQUIRES_SUPABASE_PROVIDER");
}
if (environment === "staging" || environment === "production") {
  throw new Error("SUPABASE_VERIFICATION_FORBIDDEN_IN_DEPLOYED_ENVIRONMENT");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`SUPABASE_VERIFICATION_CONFIGURATION_MISSING:${name}`);
  return value;
}

const supabaseUrl = new URL(required("NEXT_PUBLIC_SUPABASE_URL"));
const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const functionUrl = new URL(
  process.env.AUTHENTICATED_RPC_FUNCTION_URL?.trim()
    || "/functions/v1/authenticated-rpc",
  supabaseUrl,
);

async function request(url, init, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    throw new Error(`${label}_UNAVAILABLE:${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

const authResponse = await request(
  new URL("/auth/v1/settings", supabaseUrl),
  { headers: { apikey: anonKey } },
  "SUPABASE_AUTH",
);
if (!authResponse.ok) {
  throw new Error(`SUPABASE_AUTH_HTTP_${authResponse.status}`);
}

const readinessResponse = await request(
  new URL("/rest/v1/rpc/get_application_readiness", supabaseUrl),
  {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: "{}",
  },
  "SUPABASE_DATABASE",
);
if (!readinessResponse.ok) {
  throw new Error(`SUPABASE_DATABASE_HTTP_${readinessResponse.status}`);
}
const readinessPayload = await readinessResponse.json();
const readiness = Array.isArray(readinessPayload) ? readinessPayload[0] : readinessPayload;
if (!readiness || readiness.status !== "ready") {
  throw new Error("SUPABASE_DATABASE_NOT_READY");
}

const edgeResponse = await request(
  functionUrl,
  {
    method: "POST",
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "get_application_readiness", args: {} }),
  },
  "SUPABASE_AUTHENTICATED_RPC",
);
if (![401, 403].includes(edgeResponse.status)) {
  throw new Error(`SUPABASE_AUTHENTICATED_RPC_UNEXPECTED_HTTP_${edgeResponse.status}`);
}

process.stdout.write(JSON.stringify({
  status: "ok",
  environment,
  provider,
  auth: "reachable",
  database: "ready",
  authenticated_rpc: "reachable_and_protected",
}, null, 2));
process.stdout.write("\n");
