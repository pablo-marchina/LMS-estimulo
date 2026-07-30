import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  adminOAuthPreparationTarget,
  adminOAuthRedirectTarget,
  decodeLocalAdminCallback,
  encodeLocalAdminCallback,
  localAdminCallbackUrl,
  localAdminOAuthResumeUrl,
} from "../../apps/web/lib/auth/admin-oauth-bridge-core.mjs";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [adminShell, experiencePage, visualSelector, previewBridge, nextConfig, startRoute, bridgeRoute, prepareRoute, proxy] = await Promise.all([
  read("apps/web/components/admin-shell.tsx"),
  read("apps/web/app/admin/experiencia/page.tsx"),
  read("apps/web/app/admin/experiencia/visual-interface-selector.tsx"),
  read("apps/web/components/interface-preview-bridge.tsx"),
  read("apps/web/next.config.ts"),
  read("apps/web/app/auth/admin/start/route.ts"),
  read("apps/web/app/auth/admin/local-bridge/route.ts"),
  read("apps/web/app/auth/admin/local-bridge/prepare/route.ts"),
  read("apps/web/proxy.ts"),
]);

test("local OAuth first prepares a short-lived hosted return cookie", () => {
  const target = new URL(adminOAuthPreparationTarget({
    applicationOrigin: "http://localhost:3000",
    requestOrigin: "http://localhost:3000",
  }));
  assert.equal(target.origin, "https://lms-estimulo-web.vercel.app");
  assert.equal(target.pathname, "/auth/admin/local-bridge/prepare");
  assert.equal(target.searchParams.get("return_to"), "http://localhost:3000/auth/admin/callback");
  assert.equal(localAdminOAuthResumeUrl(target.searchParams.get("return_to"))?.toString(), "http://localhost:3000/auth/admin/start?bridge_ready=1");
});

test("local OAuth gives Supabase the exact hosted Site URL", () => {
  assert.equal(
    adminOAuthRedirectTarget({
      applicationOrigin: "http://localhost:3000",
      requestOrigin: "http://localhost:3000",
    }),
    "https://lms-estimulo-web.vercel.app/",
  );
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

test("bridge accepts and encodes only the exact local admin callback", () => {
  const callback = "http://localhost:3000/auth/admin/callback";
  assert.equal(localAdminCallbackUrl(callback)?.toString(), callback);
  assert.equal(decodeLocalAdminCallback(encodeLocalAdminCallback(callback))?.toString(), callback);
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

test("admin OAuth start, preparation, proxy and fallback routes are wired together", () => {
  assert.match(startRoute, /adminOAuthPreparationTarget/);
  assert.match(startRoute, /bridge_ready/);
  assert.match(startRoute, /ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN/);
  assert.match(prepareRoute, /ADMIN_LOCAL_OAUTH_RETURN_COOKIE/);
  assert.match(prepareRoute, /localAdminOAuthResumeUrl/);
  assert.match(proxy, /decodeLocalAdminCallback/);
  assert.match(proxy, /clearLocalOAuthReturnCookie/);
  assert.match(bridgeRoute, /localAdminCallbackUrl/);
});
