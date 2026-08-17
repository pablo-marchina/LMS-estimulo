import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audit = await readFile("scripts/e2e/production-visual-composition-audit.mjs", "utf8");

test("selected lesson URL includes the content state and fragment", () => {
  assert.match(audit, /\?conteudo=\$\{encodeURIComponent\(stepInstanceId\)\}#aula/u);
});
