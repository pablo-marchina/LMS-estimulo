import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/engajamento/page.tsx", "utf8");
const shell = await readFile("apps/web/components/participant-shell.tsx", "utf8");

test("engagement hub has all five sections", () => {
  assert.match(page, /Conquistas/u);
  assert.match(page, /pode ganhar/u);
  assert.match(page, /pontuação/iu);
  assert.match(page, /Ranking/u);
  assert.match(page, /Entregas/u);
});

test("engagement hub reuses the existing engagement and practice runtimes", () => {
  assert.match(page, /participantHub/u);
  assert.match(page, /listParticipantJourneys/u);
  assert.match(page, /practiceRuntime/u);
});

test("participant navigation exposes one engagement destination", () => {
  assert.match(shell, /\/empreendedor\/engajamento/u);
  assert.match(shell, /label: "Engajamento"/u);
  assert.doesNotMatch(shell, /label: "Pontuação"/u);
  assert.doesNotMatch(shell, /label: "Conquistas"/u);
  assert.doesNotMatch(shell, /label: "Entregas"/u);
});
