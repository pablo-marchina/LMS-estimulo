import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const applicationRoot = path.join(root, "apps/web");
const gatewayPath = path.join(root, "supabase/functions/authenticated-rpc/index.ts");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(absolute));
    else if (/\.(?:ts|tsx|mjs)$/u.test(entry.name)) result.push(absolute);
  }
  return result;
}

const gateway = await readFile(gatewayPath, "utf8");
const allowlistMatch = gateway.match(/const allowedRpcs = new Set\(`([^`]+)`\.split/u);
assert.ok(allowlistMatch, "authenticated RPC allowlist could not be parsed");
const allowed = new Set(allowlistMatch[1].trim().split(/\s+/u));

const required = new Set([
  "clear_admin_activity_parts",
  "create_admin_journey_draft_from_version",
  "get_admin_journey_editor_details",
  "save_admin_path_badge",
]);
const directCallPattern = /invokeServerRpc(?:<[^;]*?>)?\s*\(\s*["']([a-z0-9_]+)["']/gu;
for (const file of await sourceFiles(applicationRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(directCallPattern)) required.add(match[1]);
}
required.delete("e14_resolve_current_identity");

const missing = [...required].filter((name) => !allowed.has(name)).sort();
assert.deepEqual(missing, [], `RPCs invoked by the application are missing from the authenticated gateway: ${missing.join(", ")}`);

for (const operation of allowed) {
  assert.match(operation, /^[a-z][a-z0-9_]+$/u, `invalid RPC allowlist entry: ${operation}`);
}
assert.equal(allowed.size, new Set(allowed).size, "authenticated RPC allowlist contains duplicates");

process.stdout.write(`[rpc-gateway-coverage] ${required.size} required RPC operations are allowlisted\n`);
