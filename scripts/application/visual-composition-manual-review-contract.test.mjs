import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const review = await readFile("docs/reviews/visual-validation-hardening-20260816.md", "utf8");

test("visual review policy rejects metric-only approval", () => {
  assert.match(review, /Ausência de erro HTTP\/console ou de overflow, isoladamente, não equivale a aprovação visual/u);
  assert.match(review, /crawler amplo, gates geométricos de estados críticos e inspeção humana/u);
  assert.match(review, /Uma tela só conta como coberta quando o seletor que caracteriza o estado esperado realmente renderiza/u);
});
