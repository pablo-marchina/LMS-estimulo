import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/admin/produto/page.tsx", "utf8");
const actions = await readFile("apps/web/app/admin/produto/actions.ts", "utf8");

test("journey form offers archetype eligibility chips", () => {
  assert.match(page, /eligible_archetype_codes/u);
  assert.match(page, /fazedor/u);
  assert.match(page, /batalhador/u);
  assert.match(page, /construtor/u);
  assert.match(page, /navegador/u);
});

test("journey save action forwards eligible_archetype_codes to the payload", () => {
  assert.match(actions, /eligible_archetype_codes/u);
});
