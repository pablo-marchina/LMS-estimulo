import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/page.tsx", "utf8");

test("landing page exposes explicit signup and sign-in calls to action", () => {
  assert.match(page, /href="\/cadastro"/u);
  assert.match(page, /href="\/entrar"/u);
  assert.match(page, /Começar gratuitamente/u);
  assert.match(page, /Já tenho acesso/u);
  assert.doesNotMatch(page, /redirect\("\/entrar"\)/u);
});

test("landing page renders the brand, skip link and OpenAI Boost hero", () => {
  assert.match(page, /<EstimuloBrand/u);
  assert.match(page, /id="conteudo-principal"/u);
  assert.match(page, /className="skip-link"/u);
  assert.match(page, /Parceria Estímulo \+ OpenAI/u);
  assert.match(page, /ChatGPT para o seu negócio/u);
  assert.match(page, /Gratuito · Aprenda no seu ritmo/u);
  assert.doesNotMatch(page, /Seu negócio evolui\. A forma de aprender também\./u);
});

test("landing page presents the approved OpenAI learning flow without the removed featured-journey contract", () => {
  assert.doesNotMatch(page, /journeyTitle/u);
  assert.doesNotMatch(page, /journeyDescription/u);
  assert.doesNotMatch(page, /journeyTags/u);
  assert.match(page, /Você não precisa entender de tecnologia/u);
  assert.match(page, /O que você vai aprender/u);
  assert.match(page, /GANHE PONTOS/u);
  assert.match(page, /Dúvidas rápidas/u);
});

test("landing page uses the OpenAI Boost module, reward and FAQ architecture", () => {
  assert.match(page, /MÓDULO 1/u);
  assert.match(page, /MÓDULO 2/u);
  assert.match(page, /MÓDULO 3/u);
  assert.match(page, /TROQUE POR BENEFÍCIOS/u);
  assert.match(page, /Quanto tempo tenho para concluir\?/u);
  assert.match(page, /Vou receber certificado\?/u);
  assert.doesNotMatch(page, /Fazendo acontecer/u);
  assert.doesNotMatch(page, /Fortalecendo a base/u);
});
