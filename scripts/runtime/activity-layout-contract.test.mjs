import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("activity route removes the permanent lateral column with compiled CSS", async () => {
  const [layout, stylesheet] = await Promise.all([
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx"),
    read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.module.css"),
  ]);

  assert.match(layout, /import styles from "\.\/layout\.module\.css"/);
  assert.match(layout, /className=\{styles\.activityLayout\}/);
  assert.doesNotMatch(layout, /<style>/);
  assert.match(stylesheet, /\.activityLayout > div/);
  assert.match(stylesheet, /max-width: none !important/);
  assert.match(stylesheet, /display: flex !important/);
  assert.match(stylesheet, /flex-direction: column !important/);
  assert.match(stylesheet, /align-items: stretch !important/);
  assert.match(stylesheet, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.doesNotMatch(stylesheet, /300px/);
});
