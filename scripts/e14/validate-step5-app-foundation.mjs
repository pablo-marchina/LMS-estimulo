import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const required = [
  "package.json",
  "apps/web/package.json",
  "apps/web/app/entrar/page.tsx",
  "apps/web/app/empreendedor/page.tsx",
  "apps/web/app/empreendedor/diagnostico/page.tsx",
  "apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx",
  "apps/web/app/empreendedor/resultado/page.tsx",
  "apps/web/app/admin/page.tsx",
  "apps/web/lib/e14/rpc.ts",
  "apps/web/lib/auth/context.ts",
  "supabase/migrations/20260709183000_m14_step5_application_read_surfaces.sql",
  "supabase/migrations/20260709184500_m14b_step5_operator_workspace.sql"
];
for (const path of required) await access(resolve(root, path));

const rpc = await readFile(resolve(root, "apps/web/lib/e14/rpc.ts"), "utf8");
const migration = (await Promise.all([
  readFile(resolve(root, "supabase/migrations/20260709183000_m14_step5_application_read_surfaces.sql"), "utf8"),
  readFile(resolve(root, "supabase/migrations/20260709184500_m14b_step5_operator_workspace.sql"), "utf8")
])).join("\n");
const appFiles = await Promise.all(required.filter((path) => path.endsWith(".tsx") || path.endsWith(".ts")).map((path) => readFile(resolve(root, path), "utf8")));
const appText = appFiles.join("\n");

const existingRpcs = [
  "e14_publish_vertical", "e14_create_enrollment", "e14_start_journey", "e14_start_diagnostic",
  "e14_record_diagnostic_response", "e14_complete_diagnostic", "e14_start_activity",
  "e14_acknowledge_section", "e14_start_quick_check", "e14_record_quick_check_answer",
  "e14_submit_quick_check", "e14_get_participant_state", "e14_get_operator_result"
];
const newRpcs = ["e14_resolve_identity", "e14_list_participant_journeys", "e14_get_participant_experience", "e14_list_operator_instances", "e14_get_operator_workspace"];
for (const name of [...existingRpcs, ...newRpcs]) assert.ok(rpc.includes(name) || migration.includes(name), `${name} missing`);

assert.ok((await readFile(resolve(root, "apps/web/lib/supabase/admin.ts"), "utf8")).includes('import "server-only"'));
assert.ok(!appText.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(!appText.includes("is_correct"));
assert.ok(!appText.includes("videoUrl"));
assert.ok(!appText.includes("143 pontos"));
assert.ok(migration.includes("revoke all on function public.e14_get_participant_experience"));
assert.ok(migration.includes("grant execute on function public.e14_get_participant_experience"));
assert.ok(!migration.includes("'is_correct'"));
assert.ok(appText.includes("não representa risco ou elegibilidade de crédito") || appText.includes("não os apresenta como score"));

console.log(JSON.stringify({
  status: "ok",
  required_files: required.length,
  existing_rpcs_mapped: existingRpcs.length,
  new_read_rpcs: newRpcs.length,
  routes: 6,
  browser_service_role_references: 0,
  participant_correct_answer_leaks: 0
}, null, 2));
