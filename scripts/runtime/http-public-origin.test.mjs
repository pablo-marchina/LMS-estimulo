import assert from "node:assert/strict";
import test from "node:test";
import { resolvePublicApplicationOrigin } from "../../apps/web/lib/http-public-origin-core.mjs";

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
