import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [openJourney, journeyActivityAction, contracts, viewer, progress, activityPage, libraryPage, gateway, activityBuilder, contentFields, quickFields, activityActions] = await Promise.all([
  read("apps/web/app/actions/open-journey.ts"),
  read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts"),
  read("apps/web/lib/journey-runtime/contracts.ts"),
  read("apps/web/components/content-asset-viewer.tsx"),
  read("apps/web/components/activity-content-progress.tsx"),
  read("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx"),
  read("apps/web/app/capacitacao/biblioteca/[slug]/page.tsx"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("apps/web/app/admin/produto/trilha-aula-builder.tsx"),
  read("apps/web/app/admin/produto/activity-content-fields.tsx"),
  read("apps/web/app/admin/produto/quick-check-builder-fields.tsx"),
  read("apps/web/app/admin/produto/actions.ts"),
]);

test("opening an existing journey prepares paths only when no activity exists", () => {
  assert.match(openJourney, /!state\.s\?\.step_instance_id/u);
  assert.match(journeyActivityAction, /focusActivity/u);
  assert.match(journeyActivityAction, /available/u);
  assert.match(journeyActivityAction, /completed/u);
});

test("activity experience exposes tracked internal and external assets", () => {
  assert.match(contracts, /export type ActivityAsset/u);
  assert.match(contracts, /content_progress/u);
  assert.match(contracts, /duration_seconds/u);
  assert.match(gateway, /record_activity_asset_progress/u);
  assert.match(gateway, /get_activity_asset_download/u);
});

test("participant activity renders playable media and live progress", () => {
  assert.match(viewer, /youtube\.com\/iframe_api/u);
  assert.match(viewer, /videoseries/u);
  assert.match(viewer, /Abrir na fonte/u);
  assert.match(viewer, /onTimeUpdate/u);
  assert.match(viewer, /estimulo:asset-progress/u);
  assert.match(progress, /estimulo:asset-progress/u);
  assert.match(activityPage, /ContentAssetViewer/u);
  assert.match(activityPage, /ActivityContentProgress/u);
  assert.doesNotMatch(activityPage, /Leitura guiada/u);
  assert.doesNotMatch(activityPage, /Ideias essenciais/u);
});

test("library content plays media inside the platform", () => {
  assert.match(libraryPage, /ContentAssetViewer/u);
  assert.match(libraryPage, /Assista agora/u);
  assert.match(libraryPage, /Ouça agora/u);
  assert.match(libraryPage, /Visualize o material/u);
  assert.match(libraryPage, /Leia o documento/u);
});

test("administrator builds activities from reusable library content", () => {
  assert.match(activityBuilder, /ActivityContentFields/u);
  assert.match(activityBuilder, /QuickCheckBuilderFields/u);
  assert.match(contentFields, /name="content_source"/u);
  assert.match(contentFields, /name="library_item_version_id"/u);
  assert.match(contentFields, /name="new_content_file"/u);
  assert.match(activityActions, /createInlineLibraryContent/u);
  assert.match(activityActions, /attachLibraryContentToActivity/u);
});

test("quick checks support open, multiple, true-false and single choice", () => {
  assert.match(quickFields, /open_text/u);
  assert.match(quickFields, /multiple_choice/u);
  assert.match(quickFields, /true_false/u);
  assert.match(activityActions, /question_type/u);
  assert.match(activityActions, /passing_score/u);
});
