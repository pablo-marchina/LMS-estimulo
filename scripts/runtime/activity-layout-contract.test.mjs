import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("activity route removes the permanent lateral column at render time", async () => {
  const layout = await read("apps/web/app/empreendedor/atividade/[stepInstanceId]/layout.tsx");

  assert.match(layout, /display: flex !important/);
  assert.match(layout, /flex-direction: column !important/);
  assert.match(layout, /width: 100% !important/);
  assert.match(layout, /> aside/);
  assert.match(layout, /order: 1/);
  assert.match(layout, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.doesNotMatch(layout, /300px/);
});
