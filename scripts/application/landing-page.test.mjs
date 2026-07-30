import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/page.tsx", "utf8");

test("landing page exposes explicit signup and sign-in calls to action", () => {
  assert.match(page, /href="\/cadastro"/u);
  assert.match(page, /href="\/entrar"/u);
  assert.match(page, /Começar agora/u);
  assert.match(page, /Já tenho acesso/u);
  assert.doesNotMatch(page, /redirect\("\/entrar"\)/u);
});

test("landing page renders the brand, skip link and plain-language hero", () => {
  assert.match(page, /<EstimuloBrand/u);
  assert.match(page, /id="conteudo-principal"/u);
  assert.match(page, /className="skip-link"/u);
  assert.match(page, /Conhecimento que movimenta o seu negócio/u);
});

test("landing page presents the current journey and its three pillars", () => {
  assert.match(page, /IA para o seu negócio, da estratégia à execução/u);
  assert.match(page, /Marketing e Vendas com IA/u);
  assert.match(page, /Gestão com IA/u);
  assert.match(page, /Desenvolvimento com Codex/u);
});

test("landing page presents all four current archetypes without limiting language", () => {
  for (const name of ["Fazedor", "Batalhador", "Construtor", "Navegador"]) {
    assert.match(page, new RegExp(`name: "${name}"`, "u"));
  }
  assert.match(page, /Quatro perfis para orientar, nunca limitar/u);
  assert.match(page, /Transforma ideias em ação/u);
  assert.match(page, /Mantém o negócio em movimento/u);
  assert.match(page, /Cria processos, estrutura e consistência/u);
  assert.match(page, /Lê cenários, testa caminhos/u);
});
