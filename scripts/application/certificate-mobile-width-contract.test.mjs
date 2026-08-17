import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("apps/web/app/admin/gamificacao/certificate-template-manager.tsx", "utf8");

test("certificate template manager constrains implicit grid tracks on narrow screens", () => {
  assert.match(source, /id="templates-certificado" className="grid min-w-0 max-w-full grid-cols-\[minmax\(0,1fr\)\]/u);
  assert.match(source, /Card className="grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-3"/u);
  assert.match(source, /flex min-w-0 max-w-full flex-col/u);
  assert.match(source, /grid min-w-0 max-w-full grid-cols-\[minmax\(0,1fr\)\] content-start/u);
});
