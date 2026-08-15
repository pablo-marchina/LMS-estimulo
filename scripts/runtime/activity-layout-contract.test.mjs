import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("activity route uses compact tabs without trapping vertical scroll", async () => {
  const [layout, stylesheet, workspace, actions] = await Promise.all([
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css"),
    read("apps/web/components/activity-compact-workspace.tsx"),
    read("apps/web/app/actions/journey.ts"),
  ]);

  assert.match(layout, /ActivityCompactWorkspace/);
  assert.match(layout, /data-activity-workspace/);
  assert.match(layout, /data-activity-page/);
  assert.match(layout, /data-active-section="conteudo"/);
  assert.doesNotMatch(layout, /<style>/);

  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /aria-selected=\{selected\}/);
  assert.match(workspace, /createPortal/);
  assert.match(workspace, /anchorRef\.current\?\.closest<HTMLElement>\("\[data-activity-workspace\]"\)/);
  assert.doesNotMatch(workspace, /document\.querySelector<HTMLElement>\("\[data-activity-workspace\]"\)/);
  assert.match(workspace, /MutationObserver/);
  assert.match(workspace, /main\.prepend\(mount\)/);
  assert.match(workspace, /sectionFromLocation/);
  assert.match(workspace, /a\[href\^='#'\]/);
  assert.match(workspace, /root\.addEventListener\("click"/);
  assert.doesNotMatch(workspace, /document\.addEventListener\("click"/);
  assert.match(workspace, /event\.preventDefault\(\)/);
  assert.match(workspace, /scrollIntoView/);
  assert.doesNotMatch(workspace, /main\.scrollTo/);
  assert.match(workspace, /sticky top-16/);

  assert.match(actions, /function inlineActivityHref\(journey: string, step: string, query = "", hash = "aula"\)/u);
  assert.match(actions, /inlineActivityHref\(journey, step, "&utilidade=registrada", "conteudo"\)/u);
  assert.match(actions, /inlineActivityHref\(journey, step, "&comentario=criado", "comentarios"\)/u);
  assert.match(actions, /inlineActivityHref\(journey, step, "&avaliacao=reprovada", "avaliacao"\)/u);
  assert.doesNotMatch(actions, /\/empreendedor\/atividade\/\$\{step\}\?utilidade=registrada/u);

  assert.match(stylesheet, /\.activityPage/);
  assert.match(stylesheet, /div:has\(> main \+ aside\)/);
  assert.match(stylesheet, /grid-template-columns: minmax\(0, 1fr\) 18rem/);
  assert.match(stylesheet, /data-active-section="conteudo"/);
  assert.match(stylesheet, /nav\[aria-label="Índice da aula"\]/);
  assert.match(stylesheet, /overflow: visible/);
  assert.doesNotMatch(stylesheet, /\.grid\.items-start\.gap-5/);
  assert.doesNotMatch(stylesheet, /(?:^|\n)\s*height:\s*calc\(100dvh - 4rem\)/u);
  assert.doesNotMatch(stylesheet, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.doesNotMatch(stylesheet, /300px/);
});

test("participant screens use editorial names and compact spacing", async () => {
  const [shell, density, names, progress, result, migration] = await Promise.all([
    read("apps/web/components/participant-shell.tsx"),
    read("apps/web/components/participant-density.module.css"),
    read("apps/web/lib/content/display-name.ts"),
    read("apps/web/components/journey-progress-nav.tsx"),
    read("apps/web/app/empreendedor/resultado/page.tsx"),
    read("supabase/migrations/20260801202758_fix_activity_feedback_quick_check_titles.sql"),
  ]);

  assert.match(shell, /participant-density\.module\.css/);
  assert.doesNotMatch(shell, /<style>/);
  assert.match(density, /#conteudo-principal/);
  assert.match(density, /gap-8/);
  assert.match(density, /brand-featured-journey/);
  assert.match(density, /aspect-ratio: 16 \/ 9/);
  assert.match(names, /replaceAll\("_", " "\)/);
  assert.match(progress, /outline\?\.journey_title/);
  assert.match(progress, /displayContentName/);
  assert.doesNotMatch(result, /Seu momento/);
  assert.doesNotMatch(result, /Diagnóstico empreendedor/);
  assert.match(migration, /'journey_title'/);
  assert.match(migration, /activity_asset_progress/);
  assert.doesNotMatch(migration, /sections'\)::integer<>4/);
});
