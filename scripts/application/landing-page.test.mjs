import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/page.tsx", "utf8");

test("landing page exposes explicit signup and sign-in calls to action", () => {
  assert.match(page, /href="\/cadastro"/u);
  assert.match(page, /href="\/entrar"/u);
  assert.match(page, /Criar conta gratuitamente/u);
  assert.match(page, /Já tenho acesso/u);
  assert.doesNotMatch(page, /redirect\("\/entrar"\)/u);
});

test("landing page renders the brand, skip link and current plain-language hero", () => {
  assert.match(page, /<EstimuloBrand/u);
  assert.match(page, /id="conteudo-principal"/u);
  assert.match(page, /className="skip-link"/u);
  assert.match(page, /Seu negócio evolui\. A forma de aprender também\./u);
  assert.match(page, /Conhecimento que vira resultado no seu negócio\./u);
});

test("landing page presents the approved learning flow without the removed featured-journey contract", () => {
  assert.doesNotMatch(page, /journeyTitle/u);
  assert.doesNotMatch(page, /journeyDescription/u);
  assert.doesNotMatch(page, /journeyTags/u);
  assert.match(page, /Descubra por onde começar/u);
  assert.match(page, /Desenvolva habilidades práticas/u);
  assert.match(page, /Evolua e abra novas oportunidades/u);
});

test("landing page presents the four current learning moments without limiting language", () => {
  for (const name of ["Fazendo acontecer", "Fortalecendo a base", "Construindo o crescimento", "Próximo nível"]) {
    assert.match(page, new RegExp(`name: "${name}"`, "u"));
  }
  assert.match(page, /Cada empreendedor aprende de um jeito\./u);
  assert.match(page, /Recomendações que orientam, sem limitar\./u);
});
