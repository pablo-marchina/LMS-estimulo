import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [page, runtime, migration] = await Promise.all([
  read("apps/web/app/admin/gamificacao/page.tsx"),
  read("apps/web/lib/admin/gamification-management.ts"),
  read("supabase/migrations/20260806144500_definitive_admin_gamification_and_user_directory.sql"),
]);

function functionBlock(source, signature, nextBoundary) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} is missing`);
  const end = source.indexOf(nextBoundary, start + signature.length);
  assert.notEqual(end, -1, `${signature} has no deterministic boundary`);
  return source.slice(start, end);
}

test("gamification route uses a dedicated, defensive workspace", () => {
  assert.match(page, /getAdminGamificationWorkspace/u);
  assert.doesNotMatch(page, /getAdminProductWorkspace/u);
  for (const collection of ["rules", "journeys", "point_rules", "badges", "certificates"]) {
    assert.match(page, new RegExp(`definitions\\(workspace\\.${collection}\\)`, "u"));
  }
  assert.match(page, /function definitions\(value: unknown\)[\s\S]*Array\.isArray/u);
  assert.match(page, /function versionsOf\(item: DefinitionSummary\)[\s\S]*Array\.isArray/u);
  assert.match(runtime, /"get_admin_gamification_workspace"/u);
});

test("gamification workspace fallback covers only rollout compatibility failures", () => {
  assert.match(runtime, /code === "PGRST202"/u);
  assert.match(runtime, /code === "RPC_NOT_ALLOWED"/u);
  assert.match(runtime, /if \(!isGamificationWorkspaceCompatibilityError\(error\)\) throw error/u);
  assert.match(runtime, /getAdminProductWorkspace\(actorUserAccountId, organizationId\)/u);
  assert.doesNotMatch(runtime, /code === "42501"/u);
});

test("gamification RPC is tenant-scoped and independent from unrelated product modules", () => {
  const block = functionBlock(
    migration,
    "create or replace function public.get_admin_gamification_workspace(",
    "revoke all on function public.get_admin_gamification_workspace",
  );
  assert.match(block, /definition\.owner_organization_id=p_organization_id/u);
  assert.match(block, /estimulo_staff_can_view/u);
  assert.match(block, /engagement\.manage/u);
  for (const required of ["'rules'", "'journeys'", "'point_rules'", "'badges'", "'certificates'"]) {
    assert.match(block, new RegExp(required, "u"));
  }
  for (const unrelated of ["catalog.programs", "catalog.activity_definitions", "orchestration.path_templates", "diagnostics.diagnostic_definitions"]) {
    assert.doesNotMatch(block, new RegExp(unrelated.replaceAll(".", "\\."), "u"));
  }
  assert.match(migration, /revoke all on function public\.get_admin_gamification_workspace\(uuid,uuid\)[\s\S]*from public,anon,authenticated/u);
  assert.match(migration, /grant execute on function public\.get_admin_gamification_workspace\(uuid,uuid\)[\s\S]*to postgres,service_role,app_worker/u);
});

test("user directory starts from accounts while preserving read-only staff access", () => {
  const block = functionBlock(
    migration,
    "create or replace function public.list_organization_role_management(",
    "revoke all on function public.list_organization_role_management",
  );
  assert.match(block, /from iam\.user_accounts account/u);
  assert.match(block, /left join lateral/u);
  assert.match(block, /coalesce\(directory\.membership_status,'unlinked'\)/u);
  assert.match(block, /app_private\.estimulo_staff_can_view/u);
  assert.match(block, /iam\.memberships\.manage/u);
  assert.match(block, /journey_definition\.owner_organization_id=p_organization_id/u);
  assert.doesNotMatch(block, /insert into iam\.organization_memberships/u);
});
