import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const origin = await readFile("apps/web/lib/http-public-origin.ts", "utf8");
const adminAction = await readFile("apps/web/app/entrar/administracao/actions.ts", "utf8");
const participantAction = await readFile("apps/web/app/entrar/actions.ts", "utf8");
const callback = await readFile("apps/web/app/auth/admin/callback/route.ts", "utf8");
const proxy = await readFile("apps/web/proxy.ts", "utf8");
const signupAction = await readFile("apps/web/app/cadastro/actions.ts", "utf8");
const confirmationAction = await readFile("apps/web/app/auth/confirm/actions.ts", "utf8");
const confirmationAlias = await readFile("apps/web/app/confirm/page.tsx", "utf8");
const authLayout = await readFile("apps/web/components/auth-layout.tsx", "utf8");
const supabaseConfig = await readFile("supabase/config.toml", "utf8");
const envExample = await readFile(".env.example", "utf8");

test("preview OAuth callbacks stay on the active Vercel environment", () => {
  assert.match(origin, /VERCEL_ENV === "preview"/u);
  assert.match(origin, /VERCEL_BRANCH_URL/u);
  assert.match(origin, /VERCEL_URL/u);
  assert.match(origin, /NEXT_PUBLIC_VERCEL_URL/u);
  assert.match(origin, /VERCEL_PROJECT_PRODUCTION_URL/u);
});

test("production never accepts localhost as its public application origin", () => {
  assert.match(origin, /function isLocalOrigin/u);
  assert.match(origin, /configured && !isLocalOrigin\(configured\)/u);
  assert.match(origin, /CANONICAL_VERCEL_ORIGIN/u);
});

test("localhost and the Estimulo custom domain are valid configured environments", () => {
  assert.match(origin, /http:\/\/localhost/u);
  assert.doesNotMatch(origin, /endsWith\("\.vercel\.app"\)/u);
  assert.match(supabaseConfig, /http:\/\/localhost:3000\/\*\*/u);
  assert.match(supabaseConfig, /https:\/\/\*-pablo-marchinas-projects\.vercel\.app\/\*\*/u);
  assert.match(supabaseConfig, /https:\/\/plataforma\.estimulo\.org\/\*\*/u);
  assert.match(envExample, /NEXT_PUBLIC_APP_URL=https:\/\/plataforma\.estimulo\.org/u);
});

test("administrative login builds a callback and callback redirects on its request origin", () => {
  assert.match(adminAction, /publicApplicationOrigin/u);
  assert.match(callback, /exchangeCodeForSession/u);
  assert.match(callback, /request\.nextUrl\.origin/u);
  assert.doesNotMatch(callback, /publicApplicationOrigin/u);
});

test("OAuth codes returned to the landing page recover through the admin callback", () => {
  assert.match(proxy, /adminOAuthFallback/u);
  assert.match(proxy, /new URL\("\/auth\/admin\/callback", request\.url\)/u);
  assert.match(proxy, /callback\.search = request\.nextUrl\.search/u);
  assert.match(proxy, /matcher: \["\/"/u);
});

test("Estimulo email accounts may authenticate as participants", () => {
  assert.match(participantAction, /signInWithPassword/u);
  assert.doesNotMatch(participantAction, /isEstimuloAdministrativeEmail/u);
  assert.match(participantAction, /entrepreneur_id/u);
});

test("public signup and resend use the configured confirmation URL", () => {
  assert.match(signupAction, /new URL\("\/confirm", publicApplicationOrigin\(\)\)/u);
  assert.match(confirmationAction, /new URL\("\/confirm", publicApplicationOrigin\(\)\)/u);
  assert.match(confirmationAction, /redirect\("\/confirm\?/u);
  assert.match(confirmationAlias, /auth\/confirm\/page/u);
});

test("login uses the expressive Estimulo brand composition", () => {
  assert.match(authLayout, /brand-auth-stage/u);
  assert.match(authLayout, /brand-logo-capsule/u);
  assert.match(authLayout, /Jornadas práticas, diagnósticos e conquistas/u);
});
