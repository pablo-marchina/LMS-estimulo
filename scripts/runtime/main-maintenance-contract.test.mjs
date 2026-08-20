import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("platform loading uses one global progress bar and no page skeletons", async () => {
  const [loading, feedback, shell] = await Promise.all([read("apps/web/app/loading.tsx"), read("apps/web/components/navigation-feedback.tsx"), read("apps/web/components/participant-shell.tsx")]);
  assert.match(loading, /fixed inset-x-0 top-0/);
  assert.doesNotMatch(loading, /grid-cols|h-48|skeleton/i);
  assert.match(feedback, /role="progressbar"/);
  assert.match(feedback, /document\.addEventListener\("submit"/);
  assert.doesNotMatch(shell, /ParticipantNavigationProgress/);
});

test("lesson consumes one continuous centered content area without a permanent side column", async () => {
  const [shell, layoutCss, lesson, journey] = await Promise.all([
    read("apps/web/components/participant-shell.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx"),
    read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
  ]);
  assert.match(shell, /pathname\.startsWith\("\/empreendedor\/atividade\/"\)/);
  assert.match(shell, /wideLesson \? "w-full min-w-0"/);
  assert.doesNotMatch(shell, /\[&>div\]:max-w-none/);
  assert.match(lesson, /max-w-\[1100px\]/u);
  assert.doesNotMatch(lesson, /ActivityContentProgress/u);
  assert.doesNotMatch(lesson, /300px/u);
  assert.doesNotMatch(layoutCss, /18rem/u);
  assert.doesNotMatch(layoutCss, /position: sticky/u);
  assert.doesNotMatch(layoutCss, /#aula:has/u);
  assert.match(journey, /redirect\(`\/empreendedor\/atividade\/\$\{selectedActivity\.step_instance_id\}/u);
  assert.doesNotMatch(journey, /<section id="aula"/u);
  assert.doesNotMatch(journey, /ActivityWorkspaceFrame/u);
});

test("admin extension saves do not catch successful Next redirects", async () => {
  const action = await read("apps/web/app/admin/extension-actions.ts");
  const tryBlock = action.match(/try \{([\s\S]*?)\} catch/u)?.[1] ?? "";
  assert.doesNotMatch(tryBlock, /redirect\(/);
  assert.match(action, /if \(failureCode\) redirect/);
  assert.match(action, /redirect\(`\$\{returnTo\}\?sucesso=/);
});

test("participant interface preview renders real routes with read-only impersonation", async () => {
  const [selector, previewPage, bootstrap, contextFacade, requestContext, proxy, gateway, extensionGateway, edge, guard, bridge, shell] = await Promise.all([
    read("apps/web/app/admin/experiencia/visual-interface-selector.tsx"),
    read("apps/web/app/interface-preview/participant/page.tsx"),
    read("apps/web/app/interface-preview/participant/start/route.ts"),
    read("apps/web/lib/auth/context.ts"),
    read("apps/web/lib/request-context/auth-context.ts"),
    read("apps/web/proxy.ts"),
    read("apps/web/lib/rpc/authenticated-gateway.ts"),
    read("apps/web/lib/extensions/gateway.ts"),
    read("supabase/functions/platform-extensions-rpc/index.ts"),
    read("apps/web/components/interface-preview-guard.tsx"),
    read("apps/web/components/interface-preview-bridge.tsx"),
    read("apps/web/components/participant-shell.tsx"),
  ]);
  assert.match(selector, /\/interface-preview\/participant\/start/);
  assert.match(selector, /sandbox="allow-same-origin allow-scripts"/);
  assert.doesNotMatch(previewPage, /Conteúdo demonstrativo|Gestão para crescer|IA aplicada ao negócio/);
  assert.match(bootstrap, /serializeInterfacePreviewIdentity/);
  assert.match(contextFacade, /request-context\/auth-context/);
  assert.doesNotMatch(contextFacade, /resolveInterfacePreviewIdentity/);
  assert.match(requestContext, /resolveInterfacePreviewIdentity/);
  assert.match(proxy, /INTERFACE_PREVIEW_REQUEST_HEADER/);
  assert.match(gateway, /previewReadOnlyRpcs/);
  assert.match(extensionGateway, /preview_participant_extensions/);
  assert.match(extensionGateway, /get_participant_shell_context/u);
  assert.match(edge, /preview_participant_rpc/);
  assert.match(edge, /INTERFACE_PREVIEW_WRITE_BLOCKED/);
  assert.match(edge, /get_admin_extensions_workspace/);
  assert.match(edge, /get_participant_shell_context/u);
  assert.match(guard, /preventInteraction/);
  assert.match(bridge, /pathname: window\.location\.pathname/);
  assert.match(shell, /!preview \? <BehaviorEventTracker/);
});

test("behavior score validation rejects unsafe configurations at every boundary", async () => {
  const [editor, migration, action, gateway] = await Promise.all([read("apps/web/components/behavior-score-editor.tsx"), read("supabase/migrations/20260801131203_harden_behavior_score_configuration.sql"), read("apps/web/app/admin/extension-actions.ts"), read("supabase/functions/platform-extensions-rpc/index.ts")]);
  assert.match(editor, /soma dos pesos/);
  assert.match(editor, /lacuna/);
  assert.match(migration, /BEHAVIOR_WEIGHT_TOTAL_INVALID/);
  assert.match(migration, /BEHAVIOR_CLASSIFICATION_COVERAGE_INVALID/);
  assert.match(migration, /create trigger trg_behavior_score_configuration_validate/);
  assert.match(action, /"code" in error/);
  assert.match(gateway, /domainCode/);
});

test("documentation describes the single-journey model", async () => {
  const [readme, lifecycle, foundation] = await Promise.all([read("README.md"), read("docs/journeys/JOURNEY_LIFECYCLE.md"), read("docs/implementation/APPLICATION_FOUNDATION.md")]);
  assert.match(readme, /Cada jornada é única/);
  assert.match(lifecycle, /draft <-> published/);
  assert.doesNotMatch(foundation, /nova versão.*jornada/iu);
});
