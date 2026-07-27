import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/jornadas/page.tsx", "utf8");
const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/enrollment.ts", "utf8");

test("jornadas catalog page fetches eligible journeys and offers a self-enroll action", () => {
  assert.match(page, /listEligibleJourneys/u);
  assert.match(page, /selfEnrollAction|selfEnroll/u);
  assert.match(page, /Entrar nesta jornada/u);
});

test("jornadas catalog separates archetype-matched jornadas from open-to-all jornadas", () => {
  assert.match(page, /open_to_all/u);
});

test("participant home links to the jornadas catalog", () => {
  assert.match(home, /\/empreendedor\/jornadas/u);
});

test("self-enroll server action requires authentication and calls journeyRuntime.selfEnroll", () => {
  assert.match(actions, /getAuthContext/u);
  assert.match(actions, /selfEnroll/u);
  assert.match(actions, /\/empreendedor\/jornadas\?erro=matricula/u);
});
