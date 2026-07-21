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

test("participant confirmation recovers from PKCE mismatch and reports resend failures", async () => {
  const [
    page,
    action,
    confirmationPage,
    confirmationAction,
    signInPage,
    signInAction,
    completionPage,
    completionAction,
  ] = await Promise.all([
    read("apps/web/app/cadastro/page.tsx"),
    read("apps/web/app/cadastro/actions.ts"),
    read("apps/web/app/auth/confirm/page.tsx"),
    read("apps/web/app/auth/confirm/actions.ts"),
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/app/entrar/actions.ts"),
    read("apps/web/app/cadastro/concluir/page.tsx"),
    read("apps/web/app/cadastro/concluir/actions.ts"),
  ]);

  await assertMissing("apps/web/app/auth/confirm/route.ts");
  assert.match(page, /createPublicAccountAction/);
  assert.match(action, /auth\.signUp/);
  assert.match(action, /emailRedirectTo/);
  assert.doesNotMatch(action, /auth\.admin\.createUser|email_confirm:\s*true/);

  assert.match(confirmationPage, /confirmEmailAction/);
  assert.match(confirmationPage, /resendConfirmationAction/);
  assert.match(confirmationPage, /Concluir confirmação/);
  assert.match(confirmationPage, /Entrar com minha senha/);
  assert.match(confirmationPage, /Reenviar confirmação/);
  assert.match(confirmationPage, /Contas já confirmadas não recebem outro e-mail/);
  assert.match(confirmationPage, /limite_envio/);
  assert.match(confirmationPage, /envio_falhou/);
  assert.match(confirmationPage, /type="hidden" name="token_hash"/);
  assert.doesNotMatch(confirmationPage, /verifyOtp|exchangeCodeForSession|createSessionClient/);

  assert.match(confirmationAction, /^"use server";/);
  assert.match(confirmationAction, /verifyOtp/);
  assert.match(confirmationAction, /exchangeCodeForSession/);
  assert.match(confirmationAction, /bad_code_verifier/);
  assert.match(confirmationAction, /\/entrar\?cadastro=confirmado/);
  assert.match(confirmationAction, /auth\.getUser\(\)/);
  assert.match(confirmationAction, /email_confirmed_at/);
  assert.match(confirmationAction, /auth\.resend/);
  assert.match(confirmationAction, /emailRedirectTo/);
  assert.match(confirmationAction, /authErrorStatus\(error\) === 429/);
  assert.match(confirmationAction, /erro=limite_envio/);
  assert.match(confirmationAction, /erro=envio_falhou/);
  assert.match(confirmationAction, /redirect\("\/cadastro\/concluir"\)/);
  assert.match(confirmationAction, /reenviado=1/);
  assert.match(signInAction, /error\?\.code === "email_not_confirmed"/);
  assert.match(signInAction, /erro=confirmacao_necessaria/);
  assert.match(signInPage, /cadastro === "confirmado"/);
  assert.match(signInPage, /link de confirmação já foi processado/);
  assert.match(completionPage, /name="cpf"/u);
  assert.match(completionAction, /getAuthContext/);
});

test("recreated Auth users relink only when the previous subject is orphaned", async () => {
  const migration = await read("supabase/migrations/20260721201146_relink_orphaned_external_identities.sql");

  assert.match(migration, /from auth\.users au/);
  assert.match(migration, /au\.id::text = trim\(p_subject\)/);
  assert.match(migration, /au\.email_confirmed_at is not null/);
  assert.match(migration, /au\.deleted_at is null/);
  assert.match(migration, /raw_app_meta_data/);
  assert.match(migration, /v_previous_subject/);
  assert.match(migration, /set subject = trim\(p_subject\)/);
  assert.match(migration, /raise exception 'identity_link_required'/);
});

test("authenticated identity and runtime RPCs do not depend on a local service-role key", async () => {
  const [
    currentIdentity,
    context,
    callback,
    sharedGateway,
    serverInvoke,
    edgeGateway,
    createMigration,
    removalMigration,
  ] = await Promise.all([
    read("apps/web/lib/auth/current-identity.ts"),
    read("apps/web/lib/auth/context.ts"),
    read("apps/web/app/auth/admin/callback/route.ts"),
    read("apps/web/lib/rpc/authenticated-gateway.ts"),
    read("apps/web/lib/rpc/server-invoke.ts"),
    read("supabase/functions/authenticated-rpc/index.ts"),
    read("supabase/migrations/20260721202716_authenticated_current_identity_resolution.sql"),
    read("supabase/migrations/20260721203714_remove_public_current_identity_rpc.sql"),
  ]);

  assert.match(currentIdentity, /invokeAuthenticatedGateway<IdentityContext>/);
  assert.match(currentIdentity, /"e14_resolve_current_identity"/);
  assert.doesNotMatch(currentIdentity, /\.rpc\("e14_resolve_current_identity"\)/);
  assert.match(context, /resolveCurrentIdentity\(session\)/);
  assert.doesNotMatch(context, /journeyRuntime\.resolveIdentity|createHash|createPrivilegedClient/);
  assert.match(callback, /resolveCurrentIdentity\(client\)/);
  assert.doesNotMatch(callback, /journeyRuntime\.resolveIdentity|createHash|createPrivilegedClient/);

  assert.match(sharedGateway, /auth\.getSession\(\)/);
  assert.match(sharedGateway, /functions\/v1\/authenticated-rpc/);
  assert.match(sharedGateway, /authorization: `Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(sharedGateway, /SUPABASE_SERVICE_ROLE_KEY|createPrivilegedClient/);
  assert.match(serverInvoke, /invokeAuthenticatedGateway<T>\(name, args\)/);
  assert.doesNotMatch(serverInvoke, /SUPABASE_SERVICE_ROLE_KEY|createPrivilegedClient|functions\/v1\/authenticated-rpc/);

  assert.match(edgeGateway, /currentIdentityOperation = "e14_resolve_current_identity"/);
  assert.match(edgeGateway, /allowedRpcs/);
  assert.match(edgeGateway, /auth\.getUser\(accessToken\)/);
  assert.match(edgeGateway, /admin\.rpc\("e14_resolve_identity"/);
  assert.match(edgeGateway, /name === currentIdentityOperation/);
  assert.match(edgeGateway, /ACTOR_MISMATCH/);
  assert.match(edgeGateway, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edgeGateway, /admin\.rpc\(name, args\)/);
  assert.doesNotMatch(edgeGateway, /userClient\.rpc\("e14_resolve_current_identity"\)/);

  assert.match(createMigration, /create or replace function public\.e14_resolve_current_identity\(\)/);
  assert.match(removalMigration, /drop function if exists public\.e14_resolve_current_identity\(\)/);
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
  assert.match(adminPage, /identidade_desvinculada/);
  assert.doesNotMatch(adminPage, /type="password"|signInWithPassword/);
  assert.match(adminAction, /provider:\s*"google"/);
  assert.match(adminAction, /hd:\s*"estimulo\.org"/);
  assert.match(adminAction, /skipBrowserRedirect:\s*true/);

  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /auth\.getClaims\(\)/);
  assert.match(callback, /isGoogleAuthProvider\(user, claimsData\.claims\.amr\)/);
  assert.match(callback, /isEstimuloAdministrativeEmail\(email\)/);
  assert.match(callback, /resolveCurrentIdentity\(client\)/);
  assert.match(callback, /administrativeOrganization\(identity\)/);
  assert.match(callback, /identity_link_required/);
  assert.match(callback, /identidade_desvinculada/);
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
