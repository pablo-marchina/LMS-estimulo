import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("apps/web/lib/admin/product-management.ts", "utf8");

test("admin product types expose trilhas with nested aulas, assessment, and practice", () => {
  assert.match(source, /trilhas\?:/u);
  assert.match(source, /aulas: TrilhaAula\[\]/u);
  assert.match(source, /assessment:\s*\{/u);
  assert.match(source, /practice:\s*\{/u);
});
