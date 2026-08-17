import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [openActivityAction, journeyActions, journeyPage, participantShell, activityPage, criticalVisual, adminCriticalVisual, productionVisual, strictGate, visualWorkflow] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts", "utf8"),
  readFile("apps/web/app/actions/journey.ts", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("scripts/e2e/participant-critical-flow-visual.mjs", "utf8"),
  readFile("scripts/e2e/admin-critical-flow-visual.mjs", "utf8"),
  readFile("scripts/e2e/production-visual-capture.mjs", "utf8"),
  readFile("scripts/e2e/visual-manifest-strict-gate.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("real journey CTAs open the dedicated lesson route", () => {
  assert.match(openActivityAction, /redirect\(`\/empreendedor\/atividade\/\$\{stepInstanceId\}\?journey=\$\{journeyInstanceId\}`\)/u);
  assert.doesNotMatch(openActivityAction, /\?conteudo=\$\{stepInstanceId\}/u);
});

test("all lesson interaction redirects stay on the dedicated activity route", () => {
  assert.match(journeyActions, /function activityHref/u);
  assert.match(journeyActions, /`\/empreendedor\/atividade\/\$\{step\}\?journey=\$\{journey\}\$\{query\}/u);
  assert.match(journeyActions, /utilidade=registrada/u);
  assert.match(journeyActions, /avaliacao=reprovada/u);
  assert.doesNotMatch(journeyActions, /inlineActivityHref/u);
  assert.doesNotMatch(journeyActions, /\/empreendedor\/jornada\/\$\{journey\}\?conteudo=/u);
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

test("broad visual crawl covers wide desktop and rejects badly displaced primary content", () => {
  assert.match(productionVisual, /key: "wide", width: 1695, height: 895/u);
  assert.match(productionVisual, /key: "desktop", width: 1440, height: 1000/u);
  assert.match(productionVisual, /key: "mobile", width: 390, height: 844/u);
  assert.match(productionVisual, /document\.querySelector\("h1"\)/u);
  assert.match(productionVisual, /primary heading starts below 65% of the first viewport/u);
  assert.match(productionVisual, /primary heading is clipped horizontally/u);
  assert.match(productionVisual, /schemaVersion:\s*3/u);
});

test("broad target warnings and incomplete viewport coverage are release-blocking", () => {
  assert.match(strictGate, /target visual warning is release-blocking/u);
  assert.match(strictGate, /no same-origin visual capture produced/u);
  assert.match(strictGate, /required same-origin route .* was not captured/u);
  assert.match(strictGate, /\/admin\/certificados/u);
  assert.match(strictGate, /\/admin\/gamificacao/u);
});

test("visual evidence cannot count Vercel protection or any external redirect as an app capture", () => {
  assert.match(strictGate, /requested\.origin === final\.origin/u);
  assert.match(strictGate, /deployment protection redirected the browser/u);
  assert.match(strictGate, /browser escaped the target origin/u);
  assert.match(strictGate, /validTargetCaptures/u);
  assert.match(strictGate, /schemaVersion: 2/u);
});

test("certificate states receive dedicated wide, desktop and mobile geometry checks", () => {
  assert.match(adminCriticalVisual, /key: "wide", width: 1695, height: 895/u);
  assert.match(adminCriticalVisual, /key: "desktop", width: 1440, height: 1000/u);
  assert.match(adminCriticalVisual, /key: "mobile", width: 390, height: 844/u);
  assert.match(adminCriticalVisual, /\/admin\/certificados/u);
  assert.match(adminCriticalVisual, /\/admin\/gamificacao\?tipo=certificados/u);
  assert.match(adminCriticalVisual, /horizontal overflow/u);
  assert.match(adminCriticalVisual, /primary heading starts too low/u);
});

test("production visual workflow always runs every strict and critical visual gate", () => {
  assert.match(visualWorkflow, /node --check scripts\/e2e\/visual-manifest-strict-gate\.mjs/u);
  assert.match(visualWorkflow, /node --check scripts\/e2e\/participant-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /node --check scripts\/e2e\/admin-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /Enforce strict broad visual coverage/u);
  assert.match(visualWorkflow, /Validate canonical participant flow and composition/u);
  assert.match(visualWorkflow, /Validate critical admin certificate states/u);
  assert.match(visualWorkflow, /if: always\(\)/u);
  assert.match(visualWorkflow, /artifacts\/e2e-critical-flow/u);
  assert.match(visualWorkflow, /artifacts\/e2e-admin-critical/u);
});

test("successful published deployments automatically run the latest fail-closed visual audit", () => {
  assert.match(visualWorkflow, /deployment_status:/u);
  assert.match(visualWorkflow, /github\.event\.deployment_status\.state == 'success'/u);
  assert.match(visualWorkflow, /github\.event\.deployment_status\.environment_url != ''/u);
  assert.match(visualWorkflow, /E2E_TARGET_URL: \$\{\{ github\.event_name == 'deployment_status'/u);
  assert.match(visualWorkflow, /E2E_TARGET_SHA:/u);
  assert.match(visualWorkflow, /ref: main/u);
  assert.match(visualWorkflow, /deployment-provenance\.json/u);
  assert.match(visualWorkflow, /apps\/web\/\*\*/u);
});
