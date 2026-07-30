import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");
const runtime = await readFile("apps/web/lib/admin/product-management.ts", "utf8");

test("product editor uses structured track and lesson forms", () => {
  assert.match(page, /saveTrilhaAction/u);
  assert.match(page, /saveAulaAction/u);
  assert.match(page, /journey_version_id/u);
  assert.match(page, /path_template_id/u);
  assert.doesNotMatch(page, /JSON bruto|Cole o JSON/iu);
});

test("product actions forward typed payloads through the administrative runtime", () => {
  assert.match(actions, /saveAdminTrack\(/u);
  assert.match(actions, /saveAdminLesson\(/u);
  assert.match(actions, /payload:\s*\{/u);
  assert.match(actions, /assessment:\s*questions\.length/u);
  assert.match(actions, /practice:\s*isClosing/u);
  assert.doesNotMatch(actions, /createPrivilegedClient|SUPABASE_SERVICE_ROLE_KEY/u);
});

test("administrative product mutations use the authenticated RPC boundary", () => {
  assert.match(runtime, /save_admin_track/u);
  assert.match(runtime, /save_admin_lesson/u);
  assert.match(runtime, /invokeServerRpc/u);
});
