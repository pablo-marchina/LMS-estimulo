import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const policy = await readFile("docs/reviews/visual-validation-hardening-20260816.md", "utf8");

test("visual approval policy includes exact-state rendering, geometry and human evidence review", () => {
  assert.match(policy, /Estados dinâmicos críticos não podem depender só de descoberta por links/u);
  assert.match(policy, /reprovar se o estado de aula não puder ser descoberto\/renderizado/u);
});
