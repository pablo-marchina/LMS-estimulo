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

test("the repository has one root environment example and no test-signup switch", async () => {
  const rootExample = await read(".env.example");
  await assertMissing("apps/web/.env.example");
  assert.doesNotMatch(
    rootExample,
    /PUBLIC_SIGNUP_TEST_MODE|test public signup/i,
  );
  assert.match(
    rootExample,
    /^SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key$/m,
  );
  assert.match(
    rootExample,
    /^CPF_ENCRYPTION_KEY=replace-with-base64-encoded-32-byte-key$/m,
  );
  assert.match(
    rootExample,
    /^CPF_LOOKUP_HMAC_KEY=replace-with-independent-base64-encoded-32-byte-key$/m,
  );
  assert.match(
    rootExample,
    /Supabase and Vercel are restricted to development, test and preview/u,
  );
});

test("test-signup runtime and privileged provisioning remain absent", async () => {
  for (const relative of [
    "apps/web/app/cadastro/teste/page.tsx",
    "apps/web/app/cadastro/teste/actions.ts",
    "apps/web/lib/auth/test-public-signup.ts",
    "apps/web/lib/auth/test-public-signup-provisioning.ts",
    "scripts/database/test-public-signup/run.mjs",
  ]) {
    await assertMissing(relative);
  }

  const packageDocument = await read("package.json");
  assert.doesNotMatch(
    packageDocument,
    /test:test-public-signup|scripts\/database\/test-public-signup/,
  );
});

test("participant signup uses the public Auth flow and defers protected profile data", async () => {
  const [page, action, completionPage, completionAction] = await Promise.all([
    read("apps/web/app/cadastro/page.tsx"),
    read("apps/web/app/cadastro/actions.ts"),
    read("apps/web/app/cadastro/concluir/page.tsx"),
    read("apps/web/app/cadastro/concluir/actions.ts"),
  ]);

  assert.match(page, /createPublicAccountAction/u);
  assert.match(action, /auth\.signUp/u);
  assert.match(action, /emailRedirectTo/u);
  assert.doesNotMatch(
    action,
    /auth\.admin\.createUser|email_confirm:\s*true|protectCpf/u,
  );
  assert.doesNotMatch(page, /name="cpf"|name="telefone"/u);
  assert.match(completionPage, /name="cpf"/u);
  assert.match(completionAction, /protectCpf/u);
  assert.match(completionAction, /getAuthContext/u);
});

test("administration has a separate Google-only GET entrypoint and validates Estimulo membership", async () => {
  const [
    participantPage,
    adminPage,
    startRoute,
    callback,
    adminLayout,
    accessPolicy,
  ] = await Promise.all([
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/app/entrar/administracao/page.tsx"),
    read("apps/web/app/auth/admin/start/route.ts"),
    read("apps/web/app/auth/admin/callback/route.ts"),
    read("apps/web/app/admin/layout.tsx"),
    read("apps/web/lib/auth/administrative-access.ts"),
  ]);

  assert.match(participantPage, /href="\/entrar\/administracao"/u);
  assert.match(adminPage, /ButtonLink href="\/auth\/admin\/start"/u);
  assert.match(adminPage, /Continuar com Google/u);
  assert.doesNotMatch(
    adminPage,
    /<form action="\/auth\/admin\/start"|type="password"|signInWithPassword/u,
  );
  assert.match(startRoute, /provider:\s*"google"/u);
  assert.doesNotMatch(startRoute, /hd:\s*"estimulo\.org"/u);
  assert.match(startRoute, /skipBrowserRedirect:\s*true/u);
  assert.match(callback, /exchangeCodeForSession/u);
  assert.match(callback, /auth\.getClaims\(\)/u);
  assert.match(callback, /isGoogleAuthProvider/u);
  assert.doesNotMatch(callback, /isEstimuloAdministrativeEmail/u);
  assert.match(callback, /administrativeOrganization/u);
  assert.match(callback, /vinculo_estimulo_necessario/u);
  assert.match(callback, /client\.auth\.signOut/u);
  assert.match(adminLayout, /administrativeOrganization/u);
  assert.match(accessPolicy, /ESTIMULO_ORGANIZATION_SLUG = "estimulo"/u);
});

test("runtime identity composition is request-aware without making auth own product modules", async () => {
  const [
    currentIdentity,
    contextFacade,
    requestContext,
    sharedGateway,
    serverInvoke,
    edgeGateway,
  ] = await Promise.all([
    read("apps/web/lib/auth/current-identity.ts"),
    read("apps/web/lib/auth/context.ts"),
    read("apps/web/lib/request-context/auth-context.ts"),
    read("apps/web/lib/rpc/authenticated-gateway.ts"),
    read("apps/web/lib/rpc/server-invoke.ts"),
    read("supabase/functions/authenticated-rpc/index.ts"),
  ]);

  assert.match(currentIdentity, /invokeAuthenticatedGateway/u);
  assert.match(contextFacade, /request-context\/auth-context/u);
  assert.doesNotMatch(contextFacade, /extensionsRuntime/u);
  assert.match(requestContext, /resolveCurrentIdentity\(session\)/u);
  assert.match(requestContext, /AWS_IDENTITY_ARCHITECTURE_PENDING/u);
  assert.match(requestContext, /resolveInterfacePreviewIdentity/u);
  assert.match(sharedGateway, /auth\.getSession\(\)/u);
  assert.match(sharedGateway, /functions\/v1\/authenticated-rpc/u);
  assert.match(sharedGateway, /AWS_DATA_ARCHITECTURE_PENDING/u);
  assert.doesNotMatch(
    sharedGateway,
    /SUPABASE_SERVICE_ROLE_KEY|createPrivilegedClient/u,
  );
  assert.match(serverInvoke, /invokeAuthenticatedGateway/u);
  assert.doesNotMatch(
    serverInvoke,
    /SUPABASE_SERVICE_ROLE_KEY|createPrivilegedClient/u,
  );
  assert.match(edgeGateway, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.match(edgeGateway, /auth\.getUser\(accessToken\)/u);
  assert.match(edgeGateway, /ACTOR_MISMATCH/u);
});

test("first-touch attribution remains HttpOnly and limited to participant signup", async () => {
  const [proxy, attribution] = await Promise.all([
    read("apps/web/proxy.ts"),
    read("apps/web/lib/auth/first-touch.ts"),
  ]);

  assert.match(proxy, /httpOnly:\s*true/u);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/cadastro"/u);
  assert.match(
    proxy,
    /administrativePath \? "\/entrar\/administracao" : "\/entrar"/u,
  );
  assert.match(attribution, /MAX_UTM_LENGTH = 200/u);
});
