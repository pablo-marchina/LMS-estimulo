import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [openJourney, enrollment, pathMigration, assetMigration, contracts, progressNav, activityBuilder, activityActions] = await Promise.all([
  read("apps/web/app/actions/open-journey.ts"),
  read("apps/web/app/actions/enrollment.ts"),
  read("supabase/migrations/20260726235500_idempotent_existing_journey_path.sql"),
  read("supabase/migrations/20260727000500_activity_video_assets_and_estimulo_test.sql"),
  read("apps/web/lib/journey-runtime/contracts.ts"),
  read("apps/web/components/journey-progress-nav.tsx"),
  read("apps/web/app/admin/produto/trilha-aula-builder.tsx"),
  read("apps/web/app/admin/produto/actions.ts"),
]);

test("opening an existing journey does not assign its path again", () => {
  assert.match(openJourney, /!state\.s\?\.step_instance_id/u);
  assert.match(enrollment, /!state\.s\?\.step_instance_id/u);
  assert.match(pathMigration, /replayed',true/u);
  assert.match(pathMigration, /aggregate_version=0/u);
  assert.match(pathMigration, /aggregate_version=1/u);
});

test("activity experience exposes ordered external assets", () => {
  assert.match(assetMigration, /catalog\.content_assets/u);
  assert.match(assetMigration, /'assets'/u);
  assert.match(assetMigration, /Mentorias inspiracionais — Estímulo/u);
  assert.match(contracts, /export type ActivityAsset/u);
  assert.match(contracts, /assets: ActivityAsset\[\]/u);
});

test("participant activity renders safe YouTube video players", () => {
  assert.match(progressNav, /youtube-nocookie\.com\/embed/u);
  assert.match(progressNav, /embed\/videoseries/u);
  assert.match(progressNav, /allowFullScreen/u);
  assert.match(progressNav, /Vídeos desta atividade/u);
});

test("administrator can attach an HTTPS video while creating an activity", () => {
  assert.match(activityBuilder, /name="video_url"/u);
  assert.match(activityBuilder, /Vídeo da atividade/u);
  assert.match(activityActions, /secureExternalUrl/u);
  assert.match(activityActions, /asset:\s*\{ type: "video"/u);
});
