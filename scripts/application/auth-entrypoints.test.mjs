import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

async function assertMissing(relative) {
  await assert.rejects(
    read(relative),
    (error) => error?.code === "ENOENT",
    `${relative} must not exist`,
  );
}

test("environment examples contain no test signup switch", async () => {
  const [rootExample, webExample] = await Promise.all([
    read(".env.example"),
    read("apps/web/.env.example"),
  ]);

  assert.equal(rootExample, webExample, "root and web environment examples must remain synchronized");
  assert.doesNotMatch(rootExample, /PUBLIC_SIGNUP_TEST_MODE|test public signup/i);
  assert.match(rootExample, /^SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key$/m);
  assert.match(rootExample, /^CPF_ENCRYPTION_KEY=replace-with-base64-encoded-32-byte-key$/m);
  assert.match(rootExample, /^CPF_LOOKUP_HMAC_KEY=replace-with-independent-base64-encoded-32-byte-key$/m);
});

test("test signup runtime, route and privileged provisioning are absent", async () => {
  for (const relative of [
    "apps/web/app/cadastro/teste/page.tsx",
    "apps/web/app/cadastro/teste/actions.ts",
    "apps/web/lib/auth/test-public-signup.ts",
    "apps/web/lib/auth/test-public-signup-provisioning.ts",
    "scripts/database/test-public-signup/run.mjs",
    "scripts/database/test-public-signup/provisioning.sql",
    "scripts/database/test-public-signup/test-public-signup.sql",
  ]) await assertMissing(relative);

  const [packageDocument, removalMigration] = await Promise.all([
    read("package.json"),
    read("supabase/migrations/20260721171000_remove_test_public_signup.sql"),
  ]);
  assert.doesNotMatch(packageDocument, /test:test-public-signup|scripts\/database\/test-public-signup/);
  assert.match(removalMigration, /drop function if exists public\.provision_test_signup_participant/u);
});

test("participant signup requires the Supabase confirmation callback", async () => {
  const [page, action, callback, completionPage, completionAction] = await Promise.all([
    read("apps/web/app/cadastro/page.tsx"),
    read("apps/web/app/cadastro/actions.ts"),
    read("apps/web/app/auth/confirm/route.ts"),
    read("apps/web/app/cadastro/concluir/page.tsx"),
    read("apps/web/app/cadastro/concluir/actions.ts"),
  ]);

  assert.match(page, /createPublicAccountAction/);
  assert.match(action, /auth\.signUp/);
  assert.match(action, /emailRedirectTo/);
  assert.doesNotMatch(action, /auth\.admin\.createUser|email_confirm:\s*true/);
  assert.match(callback, /verifyOtp/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /\/cadastro\/concluir/);
  assert.match(completionPage, /name="cpf"/u);
  assert.match(completionAction, /getAuthContext/);
});

test("administration has a separate Google-only entrypoint with server validation", async () => {
  const [participantPage, participantAction, adminPage, adminAction, callback, layout, context, provider] = await Promise.all([
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/app/entrar/actions.ts"),
    read("apps/web/app/entrar/administracao/page.tsx"),
    read("apps/web/app/entrar/administracao/actions.ts"),
    read("apps/web/app/auth/admin/callback/route.ts"),
    read("apps/web/app/admin/layout.tsx"),
    read("apps/web/lib/auth/context.ts"),
    read("apps/web/lib/auth/provider.ts"),
  ]);

  assert.match(participantPage, /href="\/entrar\/administracao"/);
  assert.doesNotMatch(participantPage, /cadastro\/teste|PUBLIC_SIGNUP_TEST_MODE/);
  assert.match(participantAction, /isEstimuloAdministrativeEmail\(email\)/);
  assert.match(participantAction, /\/entrar\/administracao\?erro=conta_google_necessaria/);
  assert.doesNotMatch(participantAction, /provisionTestSignupParticipant|testPublicSignupEnabled/);

  assert.match(adminPage, /signInWithGoogleAction/);
  assert.match(adminPage, /Continuar com Google/);
  assert.doesNotMatch(adminPage, /type="password"|signInWithPassword/);
  assert.match(adminAction, /provider:\s*"google"/);
  assert.match(adminAction, /hd:\s*"estimulo\.org"/);
  assert.match(adminAction, /skipBrowserRedirect:\s*true/);

  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /auth\.getClaims\(\)/);
  assert.match(callback, /isGoogleAuthProvider\(user, claimsData\.claims\.amr\)/);
  assert.match(callback, /isEstimuloAdministrativeEmail\(email\)/);
  assert.match(callback, /journeyRuntime\.resolveIdentity/);
  assert.match(callback, /administrativeOrganization\(identity\)/);
  assert.doesNotMatch(callback, /getAuthContext/);
  assert.match(callback, /client\.auth\.signOut/);
  assert.match(layout, /auth\.provider !== "google"/);
  assert.match(layout, /administrativeOrganization\(auth\.identity\)/);
  assert.match(context, /auth\.getClaims\(\)/);
  assert.match(context, /resolveAuthProvider\(user, claimsData\.claims\.amr\)/);
  assert.match(provider, /methods\.has\("oauth"\)/);
  assert.match(provider, /last_sign_in_at/);
  assert.match(provider, /mostRecentlyUsedOAuthProvider/);
  assert.match(provider, /authenticationMethods\(amr\)\.has\("oauth"\)/);
});

test("first-touch attribution remains HttpOnly and limited to participant signup", async () => {
  const [proxy, attribution] = await Promise.all([
    read("apps/web/proxy.ts"),
    read("apps/web/lib/auth/first-touch.ts"),
  ]);
  assert.match(proxy, /httpOnly:\s*true/);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/cadastro"/);
  assert.match(proxy, /administrativePath \? "\/entrar\/administracao" : "\/entrar"/);
  assert.match(attribution, /MAX_UTM_LENGTH = 200/);
});
