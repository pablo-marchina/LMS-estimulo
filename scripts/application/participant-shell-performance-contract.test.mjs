import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile("apps/web/app/empreendedor/layout.tsx", "utf8");
const runtime = await readFile("apps/web/lib/extensions/participant-shell-runtime.ts", "utf8");
const gateway = await readFile("apps/web/lib/extensions/gateway.ts", "utf8");
const edge = await readFile("supabase/functions/platform-extensions-rpc/index.ts", "utf8");
const migration = await readFile("supabase/migrations/20260816220438_participant_shell_context.sql", "utf8");

test("participant layout loads only the shell context on every navigation", () => {
  assert.match(layout, /participantShellRuntime/u);
  assert.doesNotMatch(layout, /participantWorkspace/u);
  assert.doesNotMatch(layout, /extensionsRuntime/u);
  assert.match(runtime, /get_participant_shell_context/u);
});

test("shell context is authenticated through the existing extension gateway and remains preview-safe", () => {
  assert.match(gateway, /name === "get_participant_shell_context"/u);
  assert.match(gateway, /p_operation: "get_participant_shell_context"/u);
  assert.ok((edge.match(/"get_participant_shell_context"/gu) ?? []).length >= 2);
  assert.match(edge, /previewReadOnlyRpcs/u);
});

test("shell RPC excludes heavyweight rewards, deliveries and diagnostics work", () => {
  assert.match(migration, /pending_legal_documents/u);
  assert.match(migration, /has_b2b_access/u);
  assert.doesNotMatch(migration, /reward_ledger|reward_wallets|delivery_submissions|optional_sessions/u);
  assert.match(migration, /grant execute on function public\.get_participant_shell_context\(uuid\) to service_role/u);
  assert.match(migration, /revoke all on function public\.get_participant_shell_context\(uuid\) from public, anon, authenticated/u);
});
