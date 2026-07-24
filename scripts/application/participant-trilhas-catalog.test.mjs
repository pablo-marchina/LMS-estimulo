import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile("apps/web/app/empreendedor/trilhas/page.tsx", "utf8");
const home = await readFile("apps/web/app/empreendedor/page.tsx", "utf8");
const actions = await readFile("apps/web/app/actions/enrollment.ts", "utf8");

test("trilhas catalog page fetches eligible journeys and offers a self-enroll action", () => {
  assert.match(page, /listEligibleJourneys/u);
  assert.match(page, /selfEnrollAction|selfEnroll/u);
  assert.match(page, /Entrar nesta trilha/u);
});

test("trilhas catalog separates archetype-matched trilhas from open-to-all trilhas", () => {
  assert.match(page, /open_to_all/u);
});

test("participant home links to the trilhas catalog", () => {
  assert.match(home, /\/empreendedor\/trilhas/u);
});

test("self-enroll server action requires authentication and calls journeyRuntime.selfEnroll", () => {
  assert.match(actions, /getAuthContext/u);
  assert.match(actions, /selfEnroll/u);
});
