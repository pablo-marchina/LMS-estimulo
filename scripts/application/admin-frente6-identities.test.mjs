import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/usuarios/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/usuarios/actions.ts", "utf8");
const runtime = await readFile("apps/web/lib/admin/identity-resolution.ts", "utf8");
const migration = await readFile("supabase/migrations/20260724010500_admin_identity_resolution_queue.sql", "utf8");

test("users page exposes plain-language identity decisions", () => {
  assert.match(page, /Identidades pendentes de resolução/u);
  assert.match(page, /Vincular a este contato/u);
  assert.match(page, /Criar novo contato/u);
  assert.match(page, /Arquivar caso/u);
  assert.doesNotMatch(page, /payload|webhook|matching logic/iu);
});

test("identity decisions call an authorized, idempotent runtime", () => {
  assert.match(actions, /resolveIdentityCaseAction/u);
  assert.match(runtime, /resolve_admin_identity_resolution_case/u);
  assert.match(runtime, /idempotencyKey/u);
});

test("database queue preserves decisions while HubSpot is unavailable", () => {
  assert.match(migration, /awaiting_integration/u);
  assert.match(migration, /external_object_mappings/u);
  assert.match(migration, /sync_jobs/u);
  assert.match(migration, /e14_append_event/u);
});
