import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [openActivityAction, journeyActions, journeyPage, participantShell, activityPage, lessonWorkspace, criticalVisual, adminCriticalVisual, productionVisual, strictGate, protectionBypass, visualWorkflow] = await Promise.all([
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/actions.ts", "utf8"),
  readFile("apps/web/app/actions/journey.ts", "utf8"),
  readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/participant-shell.tsx", "utf8"),
  readFile("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx", "utf8"),
  readFile("apps/web/components/participant-activity-workspace.tsx", "utf8"),
  readFile("scripts/e2e/participant-critical-flow-visual.mjs", "utf8"),
  readFile("scripts/e2e/admin-critical-flow-visual.mjs", "utf8"),
  readFile("scripts/e2e/production-visual-capture.mjs", "utf8"),
  readFile("scripts/e2e/visual-manifest-strict-gate.mjs", "utf8"),
  readFile("scripts/e2e/vercel-protection-bypass.mjs", "utf8"),
  readFile(".github/workflows/production-visual-capture.yml", "utf8"),
]);

test("real journey CTAs keep the participant on the journey while opening the selected lesson", () => {
  assert.match(openActivityAction, /redirect\(`\/empreendedor\/jornada\/\$\{journeyInstanceId\}\?conteudo=\$\{stepInstanceId\}#aula`\)/u);
  assert.doesNotMatch(openActivityAction, /redirect\(`\/empreendedor\/atividade\//u);
});

test("lesson interaction redirects preserve the inline journey route", () => {
  assert.match(journeyActions, /function inlineActivityHref/u);
  assert.match(journeyActions, /`\/empreendedor\/jornada\/\$\{journey\}\?conteudo=\$\{step\}\$\{query\}/u);
  assert.match(journeyActions, /utilidade=registrada/u);
  assert.match(journeyActions, /avaliacao=reprovada/u);
  assert.doesNotMatch(journeyActions, /function activityHref/u);
});

test("journey page composes the shared lesson workspace without nesting a Next route page", () => {
  assert.match(journeyPage, /ParticipantActivityWorkspace/u);
  assert.match(journeyPage, /ActivityWorkspaceFrame/u);
  assert.match(journeyPage, /<section id="aula"/u);
  assert.match(journeyPage, /data-inline-lesson/u);
  assert.doesNotMatch(journeyPage, /import ActivityPage/u);
  assert.doesNotMatch(journeyPage, /redirect\(`\/empreendedor\/atividade/u);
});

test("legacy dedicated lesson URLs are compatibility redirects into the inline journey workspace", () => {
  assert.match(activityPage, /URLSearchParams\(\{ conteudo: stepInstanceId \}\)/u);
  assert.match(activityPage, /redirect\(`\/empreendedor\/jornada\/\$\{journey\}\?\$\{target\.toString\(\)\}#aula`\)/u);
  assert.doesNotMatch(activityPage, /ContentAssetViewer/u);
});

test("shared lesson owns one continuous constrained surface and is safe to embed", () => {
  assert.match(lessonWorkspace, /max-w-\[1100px\]/u);
  assert.match(lessonWorkspace, /data-unified-shell/u);
  assert.match(lessonWorkspace, /data-embedded/u);
  assert.match(lessonWorkspace, /headingLevel=\{embedded \? "h2" : "h1"\}/u);
  assert.match(participantShell, /wideLesson \? "w-full min-w-0"/u);
  assert.doesNotMatch(participantShell, /\[&>div\]:max-w-none/u);
});

test("critical visual gate executes the real form flow and enforces the inline lesson acceptance criteria", () => {
  assert.match(criticalVisual, /key: "wide", width: 1695, height: 895/u);
  assert.match(criticalVisual, /form:has\(input\[name="journey_instance_id"\]\)/u);
  assert.match(criticalVisual, /form:has\(input\[name="step_instance_id"\]\):has\(input\[name="step_status"\]\)/u);
  assert.match(criticalVisual, /url\.searchParams\.get\("conteudo"\) === expectedStep/u);
  assert.match(criticalVisual, /\[data-inline-lesson\]/u);
  assert.match(criticalVisual, /\[data-unified-shell\]/u);
  assert.match(criticalVisual, /horizontal overflow/u);
  assert.match(criticalVisual, /gap between/u);
  assert.match(criticalVisual, /prompt\/content horizontal inset mismatch/u);
  assert.match(criticalVisual, /repeated verification heading is still visible/u);
  assert.match(criticalVisual, /embedded verification still renders a nested quick-check card/u);
  assert.match(criticalVisual, /uncaught page error/u);
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

test("Vercel automation bypass is applied only to requests for the audited target origin", () => {
  assert.match(protectionBypass, /VERCEL_AUTOMATION_BYPASS_SECRET/u);
  assert.match(protectionBypass, /new URL\(request\.url\(\)\)\.origin === targetOrigin/u);
  assert.match(protectionBypass, /"x-vercel-protection-bypass": bypassSecret/u);
  assert.match(protectionBypass, /"x-vercel-set-bypass-cookie": "true"/u);
  assert.match(visualWorkflow, /VERCEL_AUTOMATION_BYPASS_SECRET: \$\{\{ secrets\.VERCEL_AUTOMATION_BYPASS_SECRET \}\}/u);
  assert.match(visualWorkflow, /node --import \.\/scripts\/e2e\/vercel-protection-bypass\.mjs scripts\/e2e\/production-visual-capture\.mjs/u);
  assert.match(visualWorkflow, /node --import \.\/scripts\/e2e\/vercel-protection-bypass\.mjs scripts\/e2e\/participant-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /node --import \.\/scripts\/e2e\/vercel-protection-bypass\.mjs scripts\/e2e\/admin-critical-flow-visual\.mjs/u);
  assert.match(visualWorkflow, /automationBypassConfigured/u);
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
  assert.match(visualWorkflow, /node --check scripts\/e2e\/vercel-protection-bypass\.mjs/u);
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
