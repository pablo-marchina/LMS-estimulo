import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [lessonLayout, rewardsPage, serverInvoke, trackAction, nextConfig, mediaUpload] = await Promise.all([
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css", "utf8"),
  readFile("apps/web/app/empreendedor/recompensas/page.tsx", "utf8"),
  readFile("apps/web/lib/rpc/server-invoke.ts", "utf8"),
  readFile("apps/web/app/admin/produto/track-save-action.ts", "utf8"),
  readFile("apps/web/next.config.ts", "utf8"),
  readFile("apps/web/lib/admin/media-upload.ts", "utf8"),
]);

test("lesson canvas keeps its centered max-width layout and hides Drive implementation copy", () => {
  assert.doesNotMatch(lessonLayout, /\.activityPage\s*,\s*\.activityPage > div[\s\S]*?margin-inline:\s*0/u);
  assert.match(lessonLayout, /brand-media-card:has\(iframe\[src\^="https:\/\/drive\.google\.com\/"\]\)[\s\S]*?display:\s*none/u);
});

test("rewards header gives wallet points a dedicated visual treatment", () => {
  assert.match(rewardsPage, /actions=\{\(/u);
  assert.match(rewardsPage, /WalletCards/u);
  assert.match(rewardsPage, /Pontos na carteira/u);
  assert.match(rewardsPage, /text-2xl font-black/u);
});

test("admin track saves use the RPC that is actually deployed", () => {
  assert.match(serverInvoke, /name === "save_admin_track_v2"[\s\S]*?return "save_admin_track"/u);
  assert.match(trackAction, /presentation:\s*\{[\s\S]*?completion_badge_version_id:\s*completionBadgeVersionId/u);
  assert.match(trackAction, /event:\s*"admin_track_save_failed"/u);
});

test("administrative image transport allows the validated image payload", () => {
  assert.match(nextConfig, /bodySizeLimit:\s*"9mb"/u);
  assert.match(mediaUpload, /ADMIN_IMAGE_MAX_BYTES\s*=\s*4\s*\*\s*1024\s*\*\s*1024/u);
});
