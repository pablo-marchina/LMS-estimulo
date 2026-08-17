import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [openActivityAction, journeyPage, participantShell, activityPage, criticalVisual, visualWorkflow] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("scripts/e2e/participant-critical-flow-visual.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("real journey CTAs open the dedicated lesson route", () => {
  assert.match(openActivityAction, /redirect\(`\/empreendedor\/atividade\/\$\{stepInstanceId\}\?journey=\$\{journeyInstanceId\}`\)/u);
  assert.doesNotMatch(openActivityAction, /\?conteudo=\$\{stepInstanceId\}/u);
});

test("legacy inline lesson URLs redirect instead of composing journey and lesson screens", () => {
  assert.match(journeyPage, /import \{ notFound, redirect \} from "next\/navigation"/u);
  assert.match(journeyPage, /if \(query\.conteudo && selectedActivity\)/u);
  assert.match(journeyPage, /redirect\(`\/empreendedor\/atividade\/\$\{selectedActivity\.step_instance_id\}\?\$\{activityQuery\.toString\(\)\}`\)/u);
  assert.doesNotMatch(journeyPage, /import ActivityPage/u);
  assert.doesNotMatch(journeyPage, /ActivityWorkspaceFrame/u);
  assert.doesNotMatch(journeyPage, /<section id="aula"/u);
});

test("dedicated lesson owns its centered content width", () => {
  assert.match(activityPage, /mx-auto w-full max-w-\[1100px\]/u);
  assert.match(participantShell, /wideLesson \? "w-full min-w-0"/u);
  assert.doesNotMatch(participantShell, /\[&>div\]:max-w-none/u);
});

test("critical visual gate executes the real form flow at user-like wide desktop size", () => {
  assert.match(criticalVisual, /key: "wide", width: 1695, height: 895/u);
  assert.match(criticalVisual, /form:has\(input\[name="journey_instance_id"\]\)/u);
  assert.match(criticalVisual, /form:has\(input\[name="step_instance_id"\]\):has\(input\[name="step_status"\]\)/u);
  assert.match(criticalVisual, /waitForURL\(\(url\) => \/\^\\\/empreendedor\\\/atividade/u);
  assert.match(criticalVisual, /lesson H1 outside first half of viewport/u);
  assert.match(criticalVisual, /activity canvas not centered/u);
  assert.match(criticalVisual, /journey hero is still rendered on lesson screen/u);
  assert.match(criticalVisual, /horizontal overflow/u);
});

test("production visual workflow always runs and preserves critical-flow evidence", () => {
  assert.match(visualWorkflow, /node --check scripts\/e2e\/participant-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /Validate canonical participant flow and composition/u);
  assert.match(visualWorkflow, /if: always\(\)/u);
  assert.match(visualWorkflow, /node scripts\/e2e\/participant-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /artifacts\/e2e-critical-flow/u);
});
