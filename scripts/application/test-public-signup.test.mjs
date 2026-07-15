import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

test("environment examples expose safe defaults for branding and test signup", async () => {
  const [rootExample, webExample] = await Promise.all([
    read(".env.example"),
    read("apps/web/.env.example")
  ]);

  assert.equal(rootExample, webExample, "root and web environment examples must remain synchronized");
  assert.match(rootExample, /^APP_ENV=development$/m);
  assert.match(rootExample, /^PUBLIC_SIGNUP_TEST_MODE=false$/m);
  assert.match(rootExample, /^NEXT_PUBLIC_ESTIMULO_LOGO_URL=https:\/\//m);
  assert.match(rootExample, /^SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key$/m);
});

test("public signup is explicitly test-only and fails closed in production", async () => {
  const gate = await read("apps/web/lib/auth/test-public-signup.ts");
  assert.match(gate, /process\.env\.NODE_ENV !== "production"/);
  assert.match(gate, /new Set\(\["development", "test"\]\)/);
  assert.match(gate, /PUBLIC_SIGNUP_TEST_MODE/);
  assert.match(gate, /SUPABASE_SERVICE_ROLE_KEY/);

  const page = await read("apps/web/app/cadastro/page.tsx");
  assert.match(page, /if \(!testPublicSignupEnabled\(\)\) notFound\(\)/);
  assert.match(page, /Uso restrito a testes/);
});

test("signup creates a confirmed test account and provisions only a participant profile", async () => {
  const action = await read("apps/web/app/cadastro/actions.ts");
  assert.match(action, /auth\.admin\.createUser/);
  assert.match(action, /email_confirm: true/);
  assert.match(action, /test_public_signup: true/);
  assert.match(action, /provisionTestSignupParticipant/);
  assert.doesNotMatch(action, /organization_memberships|membership_roles|createEnrollment/);

  const runtime = await read("apps/web/lib/auth/test-public-signup-provisioning.ts");
  assert.match(runtime, /provision_test_signup_participant/);
  assert.match(runtime, /assertTestPublicSignupEnabled/);
});

test("the official Estimulo logo is used by login and authenticated shell", async () => {
  const [brand, login, shell] = await Promise.all([
    read("apps/web/components/estimulo-brand.tsx"),
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/components/app-shell.tsx")
  ]);

  assert.match(brand, /logo-estimulo\.png/);
  assert.match(brand, /NEXT_PUBLIC_ESTIMULO_LOGO_URL/);
  assert.match(brand, /alt="Estímulo"/);
  assert.match(login, /<EstimuloBrand centered \/>/);
  assert.match(shell, /<EstimuloBrand href=.*compact \/>/s);
});

test("database provisioning is service-role-only and marked as test data", async () => {
  const migration = await read("supabase/migrations/20260715224122_test_public_signup_provisioning.sql");
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public, iam, core/i);
  assert.match(migration, /'source', 'test_public_signup'/);
  assert.match(migration, /'test_only', true/);
  assert.match(migration, /revoke all on function .* from public, anon, authenticated/is);
  assert.match(migration, /grant execute on function .* to service_role/is);
});
