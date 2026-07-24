import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const detail = await readFile("apps/web/app/empreendedor/jornada/[journeyInstanceId]/page.tsx", "utf8");

test("home shows an inline eligible-jornadas grid before the rewards preview", () => {
  assert.match(home, /listEligibleJourneys/u);
  assert.match(home, /Ver todas as jornadas disponíveis/u);
  assert.ok(home.indexOf("Jornadas disponíveis para você") < home.indexOf("Seu engajamento"));
});

test("home points the participant to the consolidated engagement hub", () => {
  assert.match(home, /\/empreendedor\/engajamento/u);
});

test("jornada detail page shows a persistent unlock banner", () => {
  assert.match(detail, /libera selo e certificado/u);
  assert.match(detail, /overallPercent/u);
});
