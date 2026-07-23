import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/page.tsx", "utf8");

test("landing page has exactly one call-to-action verb, linking to /entrar", () => {
  const entrarLinks = page.match(/href="\/entrar"/gu) ?? [];
  assert.ok(entrarLinks.length >= 2, "expects the CTA repeated at least in the header and the footer/hero");
  assert.doesNotMatch(page, /\/cadastro/u, "landing page must not offer a separate cadastro CTA");
  assert.doesNotMatch(page, />\s*Cadastrar\s*</u, "landing page must not offer a separate Cadastrar action");
});

test("landing page renders the brand mark and a plain-language hero", () => {
  assert.match(page, /<EstimuloBrand/u);
  assert.match(page, /id="conteudo-principal"/u);
  assert.match(page, /className="skip-link"/u);
});

test("landing page shows the three confirmed institutional numbers, verbatim", () => {
  assert.match(page, /R\$ 420 milhões\+/u);
  assert.match(page, /200 mil\+/u);
  assert.match(page, /\b88\b/u);
  assert.match(page, /Harvard/u);
});

test("landing page shows all four archetypes with their official names and descriptions", () => {
  assert.match(page, /🔨/u);
  assert.match(page, /Fazedor\(a\)/u);
  assert.match(page, /Sabe fazer\. Está aprendendo a gerir\./u);
  assert.match(page, /💪/u);
  assert.match(page, /Batalhador\(a\)/u);
  assert.match(page, /Tem garra\. Precisa transformar garra em estrutura\./u);
  assert.match(page, /🧱/u);
  assert.match(page, /Construtor\(a\)/u);
  assert.match(page, /Tem base\. Falta direção\./u);
  assert.match(page, /🧭/u);
  assert.match(page, /Navegador\(a\)/u);
  assert.match(page, /Sabe onde está\. Sabe para onde vai\./u);
});

test("landing page no longer redirects", () => {
  assert.doesNotMatch(page, /redirect\("\/entrar"\)/u);
});
