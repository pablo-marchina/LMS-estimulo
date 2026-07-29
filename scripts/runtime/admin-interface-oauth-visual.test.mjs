import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  adminOAuthRedirectTarget,
  localAdminCallbackUrl,
} from "../../apps/web/lib/auth/admin-oauth-bridge-core.mjs";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [adminShell, experiencePage, visualSelector, previewBridge, nextConfig, startRoute, bridgeRoute] = await Promise.all([
  read("apps/web/components/admin-shell.tsx"),
  read("apps/web/app/admin/experiencia/page.tsx"),
  read("apps/web/app/admin/experiencia/visual-interface-selector.tsx"),
  read("apps/web/components/interface-preview-bridge.tsx"),
  read("apps/web/next.config.ts"),
  read("apps/web/app/auth/admin/start/route.ts"),
  read("apps/web/app/auth/admin/local-bridge/route.ts"),
]);

test("local OAuth uses the hosted bridge and returns to localhost", () => {
  const target = new URL(adminOAuthRedirectTarget({
    applicationOrigin: "http://localhost:3000",
    requestOrigin: "http://localhost:3000",
  }));
  assert.equal(target.origin, "https://lms-estimulo-web.vercel.app");
  assert.equal(target.pathname, "/auth/admin/local-bridge");
  assert.equal(target.searchParams.get("return_to"), "http://localhost:3000/auth/admin/callback");
});

test("deployed OAuth keeps the direct application callback", () => {
  assert.equal(
    adminOAuthRedirectTarget({
      applicationOrigin: "https://preview.example.vercel.app",
      requestOrigin: "https://preview.example.vercel.app",
    }),
    "https://preview.example.vercel.app/auth/admin/callback",
  );
});

test("bridge accepts only the exact local admin callback", () => {
  assert.equal(localAdminCallbackUrl("http://localhost:3000/auth/admin/callback")?.toString(), "http://localhost:3000/auth/admin/callback");
  assert.equal(localAdminCallbackUrl("https://evil.example/auth/admin/callback"), null);
  assert.equal(localAdminCallbackUrl("http://localhost:3000/outro"), null);
});

test("admin navigation no longer hides sections under more settings", () => {
  assert.doesNotMatch(adminShell, /Mais configurações/);
  for (const label of ["Diagnósticos", "Pontuação", "Anúncios"]) assert.match(adminShell, new RegExp(label));
});

test("interface administration is driven by a visual selector", () => {
  assert.match(experiencePage, /VisualInterfaceSelector/);
  assert.match(visualSelector, /Selecione na tela o que deseja alterar/);
  assert.match(visualSelector, /interface_preview=1/);
  assert.match(previewBridge, /data-interface-content-key/);
});

test("visual preview remains protected from cross-origin framing", () => {
  assert.match(nextConfig, /frame-ancestors 'self'/);
  assert.match(nextConfig, /frame-src 'self'/);
  assert.match(nextConfig, /X-Frame-Options", value: "SAMEORIGIN/);
});

test("admin OAuth start and bridge routes are wired together", () => {
  assert.match(startRoute, /adminOAuthRedirectTarget/);
  assert.match(startRoute, /ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN/);
  assert.match(bridgeRoute, /localAdminCallbackUrl/);
  assert.match(bridgeRoute, /return_to/);
});
