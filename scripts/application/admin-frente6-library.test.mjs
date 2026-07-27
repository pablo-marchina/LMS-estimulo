import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/biblioteca/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/library.ts", "utf8");
const runtime = await readFile("apps/web/lib/library/runtime.ts", "utf8");
const uploadRoute = await readFile("apps/web/app/api/library-uploads/route.ts", "utf8");
const detail = await readFile("apps/web/app/capacitacao/biblioteca/[slug]/page.tsx", "utf8");
const migration = await readFile("supabase/migrations/20260724010600_library_dual_visibility_and_files.sql", "utf8");

test("admin library exposes files and two independent distribution axes", () => {
  assert.match(page, /Enviar um arquivo/u);
  assert.match(page, /Liberado na Biblioteca do participante/u);
  assert.match(page, /Usar também nestas jornadas/u);
  assert.doesNotMatch(page, /name="slug"/u);
});

test("library save derives the slug and persists discovery separately", () => {
  assert.match(actions, /deriveSlug/u);
  assert.match(actions, /discoverableInLibrary/u);
  assert.match(runtime, /p_discoverable_in_library/u);
  assert.match(runtime, /p_file_object_id/u);
});

test("file flow is private, bounded and authorized", () => {
  assert.match(uploadRoute, /validateLibraryContentFile/u);
  assert.match(uploadRoute, /libraryContentBucket/u);
  assert.match(migration, /6291456/u);
  assert.match(migration, /get_library_file_download/u);
  assert.match(detail, /Baixar arquivo/u);
});
