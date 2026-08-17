import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [lessonLayout, rewardsPage, contentViewer, serverInvoke, productManagement, trackAction, trackEditor, nextConfig, mediaUpload, trackMigration, pathBadgeMigration] = await Promise.all([
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/page.tsx", "utf8"),
  readFile("apps/web/components/content-asset-viewer.tsx", "utf8"),
  readFile("apps/web/lib/rpc/server-invoke.ts", "utf8"),
  readFile("apps/web/lib/admin/product-management.ts", "utf8"),
  readFile("apps/web/app/admin/produto/track-save-action.ts", "utf8"),
  readFile("apps/web/app/admin/produto/trilha-editor.tsx", "utf8"),
  readFile("apps/web/next.config.ts", "utf8"),
  readFile("apps/web/lib/admin/media-upload.ts", "utf8"),
  readFile("supabase/migrations/20260813162500_save_admin_track_v2.sql", "utf8"),
  readFile("supabase/migrations/20260817002944_link_path_badges_to_credential_issuance.sql", "utf8"),
]);

test("lesson canvas keeps its centered max-width layout", () => {
  assert.doesNotMatch(lessonLayout, /\.activityPage\s*,\s*\.activityPage > div[\s\S]*?margin-inline:\s*0/u);
});

test("Google Drive videos omit implementation-detail copy", () => {
  assert.doesNotMatch(contentViewer, /Este vídeo usa o player do Google Drive/u);
  assert.match(contentViewer, /!googleDriveUrl && embedded/u);
});

test("rewards header gives wallet points a dedicated visual treatment", () => {
  assert.match(rewardsPage, /actions=\{\(/u);
  assert.match(rewardsPage, /WalletCards/u);
  assert.match(rewardsPage, /Pontos na carteira/u);
  assert.match(rewardsPage, /text-2xl font-black/u);
});

test("admin track saves use the restored v2 RPC contract", () => {
  assert.doesNotMatch(serverInvoke, /name === "save_admin_track_v2"/u);
  assert.match(productManagement, /"save_admin_track_v2"/u);
  assert.match(trackMigration, /create or replace function public\.save_admin_track_v2/u);
  assert.match(trackMigration, /p_payload->>'completion_badge_version_id'/u);
  assert.match(trackAction, /completion_badge_version_id:\s*completionBadgeVersionId/u);
  assert.doesNotMatch(trackAction, /badge_title/u);
  assert.doesNotMatch(trackAction, /badge_description/u);
  assert.match(trackAction, /event:\s*"admin_track_save_failed"/u);
});

test("track editor selects an explicit published completion badge", () => {
  assert.match(trackEditor, /getAdminGamificationWorkspace/u);
  assert.match(trackEditor, /name="completion_badge_version_id"/u);
  assert.match(trackEditor, /completion_badge_version_id/u);
  assert.doesNotMatch(trackEditor, /name="badge_title"/u);
  assert.doesNotMatch(trackEditor, /name="badge_description"/u);
});

test("explicit path badge links are private and participate in credential issuance", () => {
  assert.match(pathBadgeMigration, /alter table engagement\.path_badge_links enable row level security/u);
  assert.match(pathBadgeMigration, /revoke all on table engagement\.path_badge_links from public, anon, authenticated, app_worker/u);
  assert.match(pathBadgeMigration, /from engagement\.path_badge_links link/u);
  assert.match(pathBadgeMigration, /if \(p_context->>'path_completed'\)::boolean is true/u);
  assert.match(pathBadgeMigration, /select distinct on \(id\)/u);
  assert.match(pathBadgeMigration, /app_private\.credential_rule_matches\([\s\S]*?'path'/u);
});

test("administrative image transport allows the validated image payload", () => {
  assert.match(nextConfig, /bodySizeLimit:\s*"9mb"/u);
  assert.match(mediaUpload, /ADMIN_IMAGE_MAX_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/u);
});
