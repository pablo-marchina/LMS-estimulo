import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const applicationRoot = path.join(root, "apps/web");
const gatewayPath = path.join(root, "supabase/functions/authenticated-rpc/index.ts");
const extensionsGatewayPath = path.join(root, "supabase/functions/platform-extensions-rpc/index.ts");

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

const [gateway, extensionsGateway] = await Promise.all([
  readFile(gatewayPath, "utf8"),
  readFile(extensionsGatewayPath, "utf8"),
]);
const allowlistMatch = gateway.match(
  /const allowedRpcs = new Set\(`([^`]+)`(?:\.trim\(\))?\.split\(\/\\s\+\/u\)\);/u,
);
assert.ok(allowlistMatch, "authenticated RPC allowlist could not be parsed");
const allowlistEntries = allowlistMatch[1].trim().split(/\s+/u);
const allowed = new Set(allowlistEntries);

const extensionsAllowlistMatch = extensionsGateway.match(/const allowed = new Set\(\[([\s\S]*?)\]\);/u);
assert.ok(extensionsAllowlistMatch, "platform extensions RPC allowlist could not be parsed");
const extensionsAllowlistEntries = [...extensionsAllowlistMatch[1].matchAll(/"([a-z][a-z0-9_]+)"/gu)].map((match) => match[1]);
const extensionsAllowed = new Set(extensionsAllowlistEntries);

const required = new Set([
  "clear_admin_activity_parts",
  "create_admin_journey_draft_from_version",
  "get_admin_interface_content",
  "get_admin_journey_editor_details",
  "publish_admin_interface_content",
  "save_admin_interface_content",
  "save_admin_path_badge",
]);
const requiredExtensions = new Set();
const directCallPattern = /invokeServerRpc(?:<[\s\S]*?>)?\s*\(\s*["']([a-z0-9_]+)["']/gu;
const extensionsCallPattern = /invoke(?:Platform)?ExtensionsGateway(?:<[^>]+>)?\s*\(\s*["']([a-z0-9_]+)["']/gu;
for (const file of await sourceFiles(applicationRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(directCallPattern)) required.add(match[1]);
  for (const match of source.matchAll(extensionsCallPattern)) requiredExtensions.add(match[1]);
}
required.delete("e14_resolve_current_identity");

const missing = [...required].filter((name) => !allowed.has(name)).sort();
assert.deepEqual(missing, [], `RPCs invoked by the application are missing from the authenticated gateway: ${missing.join(", ")}`);
const missingExtensions = [...requiredExtensions].filter((name) => !extensionsAllowed.has(name)).sort();
assert.deepEqual(missingExtensions, [], `RPCs invoked by the application are missing from the platform extensions gateway: ${missingExtensions.join(", ")}`);

for (const operation of allowed) {
  assert.match(operation, /^[a-z][a-z0-9_]+$/u, `invalid RPC allowlist entry: ${operation}`);
}
for (const operation of extensionsAllowed) {
  assert.match(operation, /^[a-z][a-z0-9_]+$/u, `invalid extensions RPC allowlist entry: ${operation}`);
}
assert.equal(allowlistEntries.length, allowed.size, "authenticated RPC allowlist contains duplicates");
assert.equal(extensionsAllowlistEntries.length, extensionsAllowed.size, "platform extensions RPC allowlist contains duplicates");

process.stdout.write(`[rpc-gateway-coverage] ${required.size} authenticated and ${requiredExtensions.size} extensions RPC operations are allowlisted\n`);
