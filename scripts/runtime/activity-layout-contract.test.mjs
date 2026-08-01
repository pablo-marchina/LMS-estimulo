import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("activity route uses a compact tabbed workspace", async () => {
  const [layout, stylesheet, workspace] = await Promise.all([
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css"),
    read("apps/web/components/activity-compact-workspace.tsx"),
  ]);

  assert.match(layout, /ActivityCompactWorkspace/);
  assert.match(layout, /data-activity-workspace/);
  assert.match(layout, /data-active-section="conteudo"/);
  assert.doesNotMatch(layout, /<style>/);

  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /aria-selected=\{selected\}/);
  assert.match(workspace, /createPortal/);
  assert.match(workspace, /sectionFromLocation/);
  assert.match(workspace, /main\.scrollTo/);

  assert.match(stylesheet, /height: calc\(100dvh - 4rem\)/);
  assert.match(stylesheet, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(stylesheet, /grid-template-columns: minmax\(0, 1fr\) 18rem/);
  assert.match(stylesheet, /overflow-y: auto/);
  assert.match(stylesheet, /data-active-section="conteudo"/);
  assert.match(stylesheet, /nav\[aria-label="Índice da aula"\]/);
  assert.doesNotMatch(stylesheet, /300px/);
});
