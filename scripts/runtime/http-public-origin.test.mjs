import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  resolveParticipantApplicationOrigin,
  resolvePublicApplicationOrigin,
} from "../../apps/web/lib/http-public-origin-core.mjs";

const administrativeLoginPage = await readFile(
  new URL("../../apps/web/app/entrar/administracao/page.tsx", import.meta.url),
  "utf8",
);
const administrativeOAuthRoute = await readFile(
  new URL("../../apps/web/app/auth/admin/start/route.ts", import.meta.url),
  "utf8",
);

test("local request origin wins over stale Vercel preview variables", () => {
  assert.equal(
    resolvePublicApplicationOrigin({
      environment: "development",
      requestOrigin: "http://localhost:3000",
      appUrl: "http://localhost:3000",
      vercelEnv: "preview",
      vercelUrl: "lms-estimulo-web.vercel.app",
      nextPublicVercelUrl: "lms-estimulo-web.vercel.app",
    }),
    "http://localhost:3000",
  );
});

test("local request keeps the actual development port", () => {
  assert.equal(
    resolvePublicApplicationOrigin({
      environment: "development",
      requestOrigin: "http://127.0.0.1:3015",
      appUrl: "http://localhost:3000",
    }),
    "http://127.0.0.1:3015",
  );
});

test("preview deployment still uses the Vercel deployment origin", () => {
  assert.equal(
    resolvePublicApplicationOrigin({
      environment: "development",
      requestOrigin: "https://preview.example.vercel.app",
      appUrl: "http://localhost:3000",
      vercelEnv: "preview",
      vercelUrl: "preview.example.vercel.app",
    }),
    "https://preview.example.vercel.app",
  );
});

test("production rejects a local configured origin", () => {
  assert.throws(
    () => resolvePublicApplicationOrigin({ environment: "production", appUrl: "http://localhost:3000" }),
    /DEPLOYED_PUBLIC_APPLICATION_ORIGIN_REQUIRED/,
  );
});

test("participant signup callback prefers the actual public request host over an admin app URL", () => {
  assert.equal(
    resolveParticipantApplicationOrigin({
      environment: "production",
      requestOrigin: "https://plataforma.estimulo.org.br/cadastro",
      appUrl: "https://admin.estimulo.org.br",
    }),
    "https://plataforma.estimulo.org.br",
  );
});

test("participant signup callback never accepts localhost as the deployed public host", () => {
  assert.equal(
    resolveParticipantApplicationOrigin({
      environment: "production",
      requestOrigin: "http://localhost:3000",
      appUrl: "https://plataforma.estimulo.org.br",
    }),
    "https://plataforma.estimulo.org.br",
  );
});

test("admin login starts OAuth through a browser-native GET link", () => {
  assert.match(administrativeLoginPage, /ButtonLink href="\/auth\/admin\/start"/);
  assert.doesNotMatch(administrativeLoginPage, /<form action="\/auth\/admin\/start" method="get">/);
});

test("admin OAuth callback is bound to the actual request origin", () => {
  assert.match(administrativeOAuthRoute, /publicApplicationOrigin\(request\.nextUrl\.origin\)/);
});
