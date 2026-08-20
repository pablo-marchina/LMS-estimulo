import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contentSection = await readFile("apps/web/app/admin/produto/product-content-section.tsx", "utf8");
const lessonBuilder = await readFile("apps/web/app/admin/produto/trilha-aula-builder.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");
const runtime = await readFile("apps/web/lib/admin/product-management.ts", "utf8");

test("product editor uses structured track and lesson forms", () => {
  assert.match(contentSection, /saveTrilhaAction/u);
  assert.match(contentSection, /TrilhaAulaBuilder/u);
  assert.match(contentSection, /journey_version_id/u);
  assert.match(lessonBuilder, /saveAulaAction/u);
  assert.match(lessonBuilder, /form action=\{saveAulaAction\}/u);
  assert.match(lessonBuilder, /name="path_template_id"/u);
  assert.doesNotMatch(`${contentSection}\n${lessonBuilder}`, /JSON bruto|Cole o JSON/iu);
});

test("product actions forward typed payloads through the administrative runtime", () => {
  assert.match(actions, /saveAdminTrack\(/u);
  assert.match(actions, /saveAdminLesson\(/u);
  assert.match(actions, /patchAdminLesson\(/u);
  assert.match(actions, /payload:\s*Record<string, unknown>\s*=\s*\{/u);
  assert.match(actions, /const assessmentWasSubmitted = formData\.has\("quiz_question_count"\)/u);
  assert.match(actions, /if \(assessmentWasSubmitted \|\| !isEdit\)/u);
  assert.match(actions, /payload\.assessment = questions\.length/u);
  assert.match(actions, /practice:\s*isClosing/u);
  assert.doesNotMatch(actions, /createPrivilegedClient|SUPABASE_SERVICE_ROLE_KEY/u);
});

test("administrative product mutations use the authenticated RPC boundary", () => {
  assert.match(runtime, /save_admin_track/u);
  assert.match(runtime, /save_admin_lesson/u);
  assert.match(runtime, /patch_admin_lesson/u);
  assert.match(runtime, /invokeServerRpc/u);
});
