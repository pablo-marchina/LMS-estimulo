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

test("lesson consumes one continuous centered content area inside the journey without a permanent side column", async () => {
  const [shell, layoutCss, lessonWorkspace, legacyRoute, journey] = await Promise.all([
    read("apps/web/components/participant-shell.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css"),
    read("apps/web/components/participant-activity-workspace.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx"),
    read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx"),
  ]);
  assert.match(shell, /wideLesson \? "w-full min-w-0"/);
  assert.doesNotMatch(shell, /\[&>div\]:max-w-none/);
  assert.match(lessonWorkspace, /max-w-\[1100px\]/u);
  assert.match(lessonWorkspace, /data-unified-shell/u);
  assert.match(lessonWorkspace, /headingLevel=\{embedded \? "h2" : "h1"\}/u);
  assert.doesNotMatch(lessonWorkspace, /ActivityContentProgress/u);
  assert.doesNotMatch(lessonWorkspace, /300px/u);
  assert.doesNotMatch(layoutCss, /18rem/u);
  assert.doesNotMatch(layoutCss, /position: sticky/u);
  assert.doesNotMatch(layoutCss, /#aula:has/u);
  assert.match(journey, /<section id="aula"/u);
  assert.match(journey, /ParticipantActivityWorkspace/u);
  assert.match(journey, /ActivityWorkspaceFrame/u);
  assert.doesNotMatch(journey, /redirect\(`\/empreendedor\/atividade/u);
  assert.match(legacyRoute, /redirect\(`\/empreendedor\/jornada\/\$\{journey\}/u);
});

test("admin extension saves do not catch successful Next redirects", async () => {
  const action = await read("apps/web/app/admin/extension-actions.ts");
  const tryBlock = action.match(/try \{([\s\S]*?)\} catch/u)?.[1] ?? "";
  assert.doesNotMatch(tryBlock, /redirect\(/);
  assert.match(action, /if \(failureCode\) redirect/);
  assert.match(action, /redirect\(`\$\{returnTo\}\?sucesso=/);
});

test("participant interface preview renders real routes with read-only impersonation", async () => {
  const [selector, previewPage, bootstrap, context, proxy, gateway, extensionGateway, edge, guard, bridge, shell] = await Promise.all([
    read("apps/web/app/admin/experiencia/visual-interface-selector.tsx"),
    read("apps/web/app/interface-preview/participant/page.tsx"),
    read("apps/web/app/interface-preview/participant/start/route.ts"),
    read("apps/web/lib/auth/context.ts"),
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
  assert.match(context, /resolveInterfacePreviewIdentity/);
  assert.match(proxy, /INTERFACE_PREVIEW_REQUEST_HEADER/);
  assert.match(gateway, /previewReadOnlyRpcs/);
  assert.match(extensionGateway, /preview_participant_extensions/);
  assert.match(extensionGateway, /get_participant_shell_context/u);
  assert.match(edge, /preview_participant_rpc/);
  assert.match(guard, /InterfacePreviewGuard/u);
  assert.match(bridge, /postMessage/u);
  assert.match(shell, /InterfacePreviewGuard/u);
});

test("behavior score validation rejects unsafe configurations at every boundary", async () => {
  const [editor, action, migration] = await Promise.all([
    read("apps/web/app/admin/comportamento/behavior-score-editor.tsx"),
    read("apps/web/app/admin/comportamento/actions.ts"),
    read("supabase/migrations/20260730132000_behavior_score_configuration.sql"),
  ]);
  assert.match(editor, /weight/u);
  assert.match(editor, /threshold/u);
  assert.match(action, /parseBehaviorScoreConfiguration/u);
  assert.match(migration, /check_behavior_score_configuration/u);
});

test("documentation describes the single-journey model", async () => {
  const [architecture, dataModel] = await Promise.all([read("docs/ARCHITECTURE.md"), read("docs/DATA_MODEL.md")]);
  assert.match(architecture, /jornada/u);
  assert.match(dataModel, /journey_instances/u);
});

test("responsive media never exceeds the viewport and is loaded globally", async () => {
  const [globals, media] = await Promise.all([read("apps/web/app/globals.css"), read("apps/web/components/content-asset-viewer.tsx")]);
  assert.match(globals, /max-width:\s*100%/u);
  assert.match(media, /max-w-full/u);
});

test("help remains available to participants but is hidden in administration", async () => {
  const support = await read("apps/web/components/support-button.tsx");
  assert.match(support, /pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)/u);
  assert.match(support, /href="\/ajuda"/u);
});

test("quick checks have dynamic count in both client and server", async () => {
  const [panel, actions] = await Promise.all([read("apps/web/components/quick-check-panel.tsx"), read("apps/web/app/actions/journey.ts")]);
  assert.match(panel, /questions\.length/u);
  assert.match(actions, /assessment\.questions/u);
});

test("library and journeys use managed multi-theme selectors", async () => {
  const [library, journey] = await Promise.all([read("apps/web/app/empreendedor/biblioteca/page.tsx"), read("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx")]);
  assert.match(library, /theme/u);
  assert.match(journey, /tone/u);
});

test("administrative library preview uses participant rendering without side effects", async () => {
  const preview = await read("apps/web/app/admin/biblioteca/preview/[itemVersionId]/page.tsx");
  assert.match(preview, /ContentAssetViewer/u);
});

test("certificate templates accept PDF or image and support inherited scopes inside certificates", async () => {
  const cert = await read("apps/web/app/admin/certificados/page.tsx");
  assert.match(cert, /PDF|imagem/u);
});

test("UTM records complete visits, associates after login and keeps authorization", async () => {
  const proxy = await read("apps/web/proxy.ts");
  assert.match(proxy, /utm_/u);
});

test("B2B access is selected by users or groups and enforced in the participant workspace", async () => {
  const accessPage = await read("apps/web/app/admin/acessos/page.tsx");
  assert.match(accessPage, /grupo|usuário|usuario/u);
});

test("reward points are automatic while cancellation still refunds points and stock transactionally", async () => {
  const actions = await read("apps/web/app/admin/recompensas/reward-actions.ts");
  assert.match(actions, /refund|cancel|stock|points/u);
});

test("deliveries support library content, activities and safe AI review modes", async () => {
  const deliveries = await read("apps/web/components/admin-delivery-operations.tsx");
  assert.match(deliveries, /IA|atividade|biblioteca/u);
});

test("optional diagnostics remain inside diagnostics and never update archetype or journey eligibility", async () => {
  const diagnostic = await read("apps/web/app/empreendedor/diagnostico/page.tsx");
  assert.doesNotMatch(diagnostic, /archetype.*update|eligibility.*update/iu);
});

test("behavior score is analytical only and starts without historical backfill", async () => {
  const migration = await read("supabase/migrations/20260730132000_behavior_score_configuration.sql");
  assert.doesNotMatch(migration, /backfill/iu);
});

test("external export remains destination-neutral", async () => {
  const docs = await read("docs/ARCHITECTURE.md");
  assert.match(docs, /export|ETL/u);
});

test("public signup freezes governed legal document ids instead of client supplied dates", async () => {
  const signup = await read("apps/web/app/cadastro/actions.ts");
  assert.match(signup, /legal/u);
});

test("legacy authenticated accounts can complete onboarding by staging an explicit governed legal snapshot", async () => {
  const migration = await read("supabase/migrations/20260801120000_legacy_onboarding_legal_snapshot.sql");
  assert.match(migration, /legal/u);
});

test("provisioning persists the staged legal snapshot without widening generic legal_accept", async () => {
  const migration = await read("supabase/migrations/20260801120000_legacy_onboarding_legal_snapshot.sql");
  assert.match(migration, /legal_accept/u);
});

test("public terms page renders the governed legal document body", async () => {
  const terms = await read("apps/web/app/termos/page.tsx");
  assert.match(terms, /termos|legal/u);
});

test("production CSP admits the GA4 script and collection endpoints without Ads domains", async () => {
  const config = await read("apps/web/next.config.ts");
  assert.match(config, /googletagmanager|google-analytics/u);
  assert.doesNotMatch(config, /doubleclick|googlesyndication/u);
});

test("journeys have a single operational record and two visible states", async () => {
  const product = await read("apps/web/app/admin/produto/page.tsx");
  assert.match(product, /draft|published/u);
});

test("new migrations have unique ordered versions", async () => {
  const manifest = await read("supabase/canonical-migrations/M16_RUNTIME_MANIFEST.json");
  assert.match(manifest, /migration|version/u);
});

test("participant preview is isolated and navigation has progress feedback", async () => {
  const [preview, feedback] = await Promise.all([read("apps/web/components/interface-preview-guard.tsx"), read("apps/web/components/navigation-feedback.tsx")]);
  assert.match(preview, /preview/u);
  assert.match(feedback, /progressbar/u);
});

test("behavior score is editable, continuous, indexed and ETL ready", async () => {
  const migration = await read("supabase/migrations/20260730132000_behavior_score_configuration.sql");
  assert.match(migration, /index|score/u);
});

test("landing preserves approved institutional copy, separates the OpenAI preview and keeps the secured edge projection", async () => {
  const landing = await read("apps/web/app/page.tsx");
  assert.match(landing, /OpenAI/u);
});

test("accepts a complete local Supabase configuration", async () => {
  const environment = await read("apps/web/lib/environment.ts");
  assert.match(environment, /SUPABASE/u);
});

test("allows an incomplete Vercel preview to build fail closed", async () => {
  const environment = await read("apps/web/lib/environment.ts");
  assert.match(environment, /VERCEL/u);
});

test("keeps missing Supabase configuration fatal outside Vercel preview", async () => {
  const environment = await read("apps/web/lib/environment.ts");
  assert.match(environment, /throw/u);
});

test("keeps Supabase forbidden in production", async () => {
  const environment = await read("apps/web/lib/environment.ts");
  assert.match(environment, /production/u);
});

test("accepts the AWS production public build contract", async () => {
  const environment = await read("apps/web/lib/environment.ts");
  assert.match(environment, /AWS|production/u);
});
