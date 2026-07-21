import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function loadRepositoryEnvironment() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(scriptDirectory, "../../.env");
  if (existsSync(envPath)) loadEnvFile(envPath);
}

export function parseBootstrapArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("INVALID_BOOTSTRAP_ARGUMENTS");
    }
    values.set(name.slice(2), value);
  }

  const organizationId = values.get("organization");
  const membershipId = values.get("membership");
  const reason = values.get("reason")?.trim();
  const idempotencyKey = values.get("idempotency-key")?.trim();

  if (!organizationId || !uuidPattern.test(organizationId)) throw new Error("ORGANIZATION_ID_REQUIRED");
  if (!membershipId || !uuidPattern.test(membershipId)) throw new Error("MEMBERSHIP_ID_REQUIRED");
  if (!reason || reason.length < 3 || reason.length > 500) throw new Error("BOOTSTRAP_REASON_REQUIRED");
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  }

  return { organizationId, membershipId, reason, idempotencyKey };
}

export async function bootstrapRoleManager({ argv = process.argv.slice(2), env = process.env } = {}) {
  const input = parseBootstrapArguments(argv);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL_REQUIRED");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY_REQUIRED");

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.rpc("bootstrap_organization_role_manager", {
    p_organization_id: input.organizationId,
    p_target_membership_id: input.membershipId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(`ROLE_MANAGER_BOOTSTRAP_FAILED:${error.code ?? "UNKNOWN"}`);

  const safeResult = {
    status: "BOOTSTRAPPED",
    request_id: data?.request_id ?? null,
    replayed: Boolean(data?.replayed),
    organization_id: input.organizationId,
    membership_id: data?.data?.membership_id ?? input.membershipId,
    role_code: data?.data?.role_code ?? "role_manager",
  };
  process.stdout.write(`${JSON.stringify(safeResult, null, 2)}\n`);
  return safeResult;
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  loadRepositoryEnvironment();
  bootstrapRoleManager().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "ROLE_MANAGER_BOOTSTRAP_FAILED"}\n`);
    process.exitCode = 1;
  });
}
