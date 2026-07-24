import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const origin = await readFile("apps/web/lib/http-public-origin.ts", "utf8");
const adminAction = await readFile("apps/web/app/entrar/administracao/actions.ts", "utf8");
const callback = await readFile("apps/web/app/auth/admin/callback/route.ts", "utf8");
const authLayout = await readFile("apps/web/components/auth-layout.tsx", "utf8");

test("preview OAuth callbacks stay on the active Vercel environment", () => {
  assert.match(origin, /VERCEL_ENV === "preview"/u);
  assert.match(origin, /VERCEL_BRANCH_URL/u);
  assert.match(origin, /VERCEL_URL/u);
  assert.match(origin, /VERCEL_PROJECT_PRODUCTION_URL/u);
  assert.match(origin, /https:\/\/lms-estimulo-web\.vercel\.app/u);
});

test("administrative login and callback share the same public origin helper", () => {
  assert.match(adminAction, /publicApplicationOrigin/u);
  assert.match(callback, /publicApplicationOrigin/u);
  assert.match(callback, /exchangeCodeForSession/u);
});

test("login uses the expressive Estimulo brand composition", () => {
  assert.match(authLayout, /brand-auth-stage/u);
  assert.match(authLayout, /brand-logo-capsule/u);
  assert.match(authLayout, /Jornadas práticas, diagnósticos e conquistas/u);
});
