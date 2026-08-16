import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const activityPage = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8");
const activityLayout = await readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx", "utf8");
const workspaceFrame = await readFile("apps/web/components/activity-workspace-frame.tsx", "utf8");
const commentPanel = await readFile("apps/web/components/activity-comment-panel.tsx", "utf8");
const outlineRuntime = await readFile("apps/web/lib/journey-runtime/outline-runtime.ts", "utf8");
const retirementMigration = await readFile("supabase/migrations/20260816220130_retire_unimplemented_application_objective_point_rule.sql", "utf8");

test("lesson follows the continuous Vanessa/Refined workspace instead of tabs or a progress sidebar", () => {
  assert.match(activityPage, /max-w-\[1100px\]/u);
  assert.match(activityPage, /Marcar como concluída/u);
  assert.match(activityPage, /O que achou desta aula\?/u);
  assert.match(activityPage, /Converse sobre esta aula/u);
  assert.match(activityPage, /rateActivityUtilityAction/u);
  assert.match(activityPage, /completeParticipantActivityAction/u);
  assert.doesNotMatch(activityPage, /ActivityContentProgress/u);
  assert.doesNotMatch(activityPage, /LessonIndexLink/u);
  assert.doesNotMatch(activityPage, /xl:grid-cols-\[minmax\(0,1fr\)_300px\]/u);
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

test("journey outline work is deduplicated inside one server render", () => {
  assert.match(outlineRuntime, /import \{ cache \} from "react"/u);
  assert.match(outlineRuntime, /getParticipantJourneyOutline = cache\(async/u);
});

test("unimplemented points actions cannot stay active", () => {
  assert.match(retirementMigration, /choose_application_objective/u);
  assert.match(retirementMigration, /status = 'retired'/u);
});
