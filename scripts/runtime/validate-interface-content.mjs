import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const [runtime, actions, page, migration, gateway, layout] = await Promise.all([
  read("apps/web/lib/interface-content/runtime.ts"),
  read("apps/web/app/admin/experiencia/actions.ts"),
  read("apps/web/app/admin/experiencia/page.tsx"),
  read("supabase/migrations/20260729204500_interface_content_cms.sql"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/layout.tsx"),
]);

assert.match(runtime, /unstable_cache/);
assert.match(runtime, /INTERFACE_CONTENT_CACHE_TAG/);
assert.match(runtime, /revalidate:\s*INTERFACE_CONTENT_REVALIDATE_SECONDS/);
assert.match(runtime, /createClient\(url, anonKey/);
assert.doesNotMatch(runtime, /createSessionClient/);
assert.match(runtime, /interface_content_fallback/);
assert.match(actions, /updateTag\(INTERFACE_CONTENT_CACHE_TAG\)/);
assert.match(actions, /interface\.content\.manage/);
assert.match(page, /interface\.content\.manage/);
assert.match(page, /CMS temporariamente indisponível/);
assert.doesNotMatch(layout, /getPublishedInterfaceContent\(\)\.catch/);

for (const operation of [
  "get_admin_interface_content",
  "save_admin_interface_content",
  "publish_admin_interface_content",
]) {
  assert.ok(gateway.includes(operation), `interface CMS RPC missing from Edge allowlist: ${operation}`);
  assert.ok(migration.includes(`function public.${operation}`), `interface CMS RPC missing from migration: ${operation}`);
}

for (const marker of [
  "create table if not exists experience.interface_content",
  "enable row level security",
  "interface.content.manage",
  "get_published_interface_content",
  "experience.interface_content.saved",
  "experience.interface_content.published",
  "INTERFACE_TABLE_EXPOSED",
]) assert.ok(migration.includes(marker), `interface CMS migration missing: ${marker}`);

assert.match(migration, /revoke all on experience\.interface_content from public,anon,authenticated/);
assert.match(migration, /grant execute on function public\.get_published_interface_content\(text,text\) to anon,authenticated,service_role/);
assert.match(migration, /jsonb_array_length\(p_entries\)>500/);
assert.match(migration, /length\(v_value->>'text'\)>2000/);

process.stdout.write("[interface-content] cache, authorization, migration, Edge and fallback contracts are valid\n");
