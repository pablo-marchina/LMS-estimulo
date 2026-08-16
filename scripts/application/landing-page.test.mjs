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

test("landing page keeps the approved Estímulo hero inside the Vanessa visual system", () => {
  assert.match(page, /<EstimuloBrand/u);
  assert.match(page, /id="conteudo-principal"/u);
  assert.match(page, /className="skip-link"/u);
  assert.match(page, /Seu negócio evolui\. A forma de aprender também\./u);
  assert.match(page, /Uma experiência gratuita que reúne conteúdos, ferramentas e recomendações personalizadas/u);
  assert.match(page, /Conhecimento que vira resultado no seu negócio\./u);
  assert.doesNotMatch(page, /Parceria Estímulo \+ OpenAI/u);
});

test("landing page preserves the approved generic learning flow", () => {
  assert.match(page, /Descubra por onde começar/u);
  assert.match(page, /Desenvolva habilidades práticas/u);
  assert.match(page, /Evolua e abra novas oportunidades/u);
  assert.match(page, /Cada empreendedor aprende de um jeito\./u);
  assert.match(page, /O que você encontra na plataforma/u);
});

test("landing page keeps the four entrepreneur profiles and separates the ChatGPT course preview", () => {
  for (const name of ["Fazendo acontecer", "Fortalecendo a base", "Construindo o crescimento", "Próximo nível"]) {
    assert.match(page, new RegExp(`name: "${name}"`, "u"));
  }
  assert.match(page, /id="curso-chatgpt"/u);
  assert.match(page, /Curso em destaque · Estímulo \+ OpenAI/u);
  assert.match(page, /ChatGPT para o seu negócio/u);
  assert.match(page, /Prévia da jornada ChatGPT para o seu negócio/u);
});
