import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const activityPage = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8");
const lessonWorkspace = await readFile("apps/web/components/participant-activity-workspace.tsx", "utf8");
const activityLayout = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx", "utf8");
const workspaceFrame = await readFile("apps/web/components/activity-workspace-frame.tsx", "utf8");
const commentPanel = await readFile("apps/web/components/activity-comment-panel.tsx", "utf8");
const outlineRuntime = await readFile("apps/web/lib/journey-runtime/outline-runtime.ts", "utf8");
const retirementMigration = await readFile("supabase/migrations/20260816220130_retire_unimplemented_application_objective_point_rule.sql", "utf8");

test("lesson follows the continuous Vanessa/Refined workspace instead of tabs or a progress sidebar", () => {
  assert.match(lessonWorkspace, /max-w-\[1100px\]/u);
  assert.match(lessonWorkspace, /Marcar como concluída/u);
  assert.match(lessonWorkspace, /O que achou desta aula\?/u);
  assert.match(lessonWorkspace, /Converse sobre esta aula/u);
  assert.match(lessonWorkspace, /rateActivityUtilityAction/u);
  assert.match(lessonWorkspace, /completeParticipantActivityAction/u);
  assert.match(lessonWorkspace, /data-unified-shell/u);
  assert.doesNotMatch(lessonWorkspace, /ActivityContentProgress/u);
  assert.doesNotMatch(lessonWorkspace, /LessonIndexLink/u);
  assert.doesNotMatch(lessonWorkspace, /xl:grid-cols-\[minmax\(0,1fr\)_300px\]/u);
});

test("legacy dedicated lesson URL redirects into the journey instead of owning a second participant screen", () => {
  assert.match(activityPage, /redirect\(`\/empreendedor\/jornada\/\$\{journey\}\?\$\{target\.toString\(\)\}#aula`\)/u);
  assert.doesNotMatch(activityPage, /JourneyProgressNav/u);
  assert.doesNotMatch(activityPage, /ContentAssetViewer/u);
});

test("lesson layout no longer mounts the compact tab workspace", () => {
  assert.doesNotMatch(activityLayout, /ActivityCompactWorkspace/u);
  assert.doesNotMatch(workspaceFrame, /ActivityCompactWorkspace/u);
});

test("comments publish in place and remain part of the lesson flow", () => {
  assert.match(commentPanel, /event\.preventDefault\(\)/u);
  assert.match(commentPanel, /createActivityCommentAction/u);
  assert.match(commentPanel, /Escreva um comentário/u);
  assert.match(commentPanel, /setComments/u);
  assert.doesNotMatch(commentPanel, /lg:grid-cols/u);
});

test("journey outline is deduplicated and performs one participant read per render", () => {
  assert.match(outlineRuntime, /import \{ cache \} from "react"/u);
  assert.match(outlineRuntime, /getParticipantJourneyOutline = cache\(\(/u);
  assert.equal((outlineRuntime.match(/get_participant_journey_outline/gu) ?? []).length, 1);
  assert.doesNotMatch(outlineRuntime, /ensure_participant_open_paths/u);
});

test("unimplemented points actions cannot stay active", () => {
  assert.match(retirementMigration, /choose_application_objective/u);
  assert.match(retirementMigration, /status = 'retired'/u);
});
