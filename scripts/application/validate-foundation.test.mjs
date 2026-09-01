import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (file) => readFile(resolve(root, file), "utf8");

async function assertPresent(relative, minimum = 40) {
  const source = await read(relative);
  assert.ok(source.length >= minimum, `${relative} must contain an implemented source`);
  return source;
}

async function findMigration(suffix) {
  const names = (await readdir(resolve(root, "supabase/migrations")))
    .filter((name) => name.endsWith(suffix))
    .sort();
  assert.equal(names.length, 1, `expected one migration ending with ${suffix}`);
  return `supabase/migrations/${names[0]}`;
}

test("workspace contains the current Next.js application and exact toolchain", async () => {
  const rootPackage = JSON.parse(await read("package.json"));
  const webPackage = JSON.parse(await read("apps/web/package.json"));
  assert.deepEqual(rootPackage.workspaces, ["apps/*"]);
  assert.equal(rootPackage.packageManager, "npm@10.9.8");
  assert.equal(webPackage.dependencies.next, "16.2.12");
  assert.equal(webPackage.dependencies.react, "19.2.7");
  assert.equal(webPackage.devDependencies.typescript, "6.0.3");
});

test("central participant, administrative and credential routes are implemented", async () => {
  for (const file of [
    "apps/web/app/entrar/page.tsx",
    "apps/web/app/entrar/administracao/page.tsx",
    "apps/web/app/cadastro/page.tsx",
    "apps/web/app/empreendedor/page.tsx",
    "apps/web/app/empreendedor/diagnostico/page.tsx",
    "apps/web/app/empreendedor/atividade/[stepInstanceId]/page.tsx",
    "apps/web/app/empreendedor/resultado/page.tsx",
    "apps/web/app/empreendedor/credenciais/page.tsx",
    "apps/web/app/credenciais/[verificationCode]/page.tsx",
    "apps/web/app/admin/page.tsx",
  ]) await assertPresent(file);
});

test("privileged Supabase credentials remain server-only and outside participant actions", async () => {
  const [admin, journeyActions, credentials, gateway] = await Promise.all([
    read("apps/web/lib/supabase/admin.ts"),
    read("apps/web/app/actions/journey.ts"),
    read("apps/web/lib/credentials/runtime.ts"),
    read("apps/web/lib/rpc/authenticated-gateway.ts"),
  ]);
  assert.match(admin, /import "server-only"/u);
  assert.match(credentials, /import "server-only"/u);
  assert.doesNotMatch(journeyActions, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.doesNotMatch(credentials, /SUPABASE_SERVICE_ROLE_KEY/u);
  assert.doesNotMatch(gateway, /SUPABASE_SERVICE_ROLE_KEY|createPrivilegedClient/u);
});

test("journey commands remain behind the typed runtime boundary", async () => {
  const rpc = await read("apps/web/lib/journey-runtime/rpc.ts");
  for (const name of [
    "startJourney",
    "startDiagnostic",
    "recordDiagnosticResponse",
    "completeDiagnostic",
    "startActivity",
    "acknowledgeSection",
    "startQuickCheck",
    "recordQuickCheckAnswer",
    "submitQuickCheck",
    "getParticipantState",
  ]) assert.match(rpc, new RegExp(name, "u"));
  assert.match(rpc, /invokeServerRpc|invokeAuthenticatedGateway/u);
});

test("multi-journey discovery does not use a hardcoded runtime UUID", async () => {
  const home = await read("apps/web/app/empreendedor/page.tsx");
  const migration = await read(await findMigration("_m14_step5_application_read_surfaces.sql"));
  assert.match(home, /listParticipantJourneys/u);
  assert.match(migration, /e14_list_participant_journeys/u);
  assert.doesNotMatch(home, /runtime_validation_journey/u);
});

test("participant and administrative authentication remain separate", async () => {
  const [login, signup, adminLogin, adminStart, adminCallback, adminAccess] = await Promise.all([
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/app/cadastro/page.tsx"),
    read("apps/web/app/entrar/administracao/page.tsx"),
    read("apps/web/app/auth/admin/start/route.ts"),
    read("apps/web/app/auth/admin/callback/route.ts"),
    read("apps/web/lib/auth/administrative-access.ts"),
  ]);
  assert.match(login, /href="\/cadastro"/u);
  assert.doesNotMatch(login, /href="\/entrar\/administracao"|Sou da equipe Estímulo/u);
  assert.match(signup, /createPublicAccountAction/u);
  assert.match(adminLogin, /ButtonLink href="\/auth\/admin\/start"/u);
  assert.doesNotMatch(adminLogin, /<form action="\/auth\/admin\/start"|type="password"/u);
  assert.match(adminStart, /provider:\s*"google"/u);
  assert.doesNotMatch(adminStart, /hd:\s*"estimulo\.org"/u);
  assert.match(adminCallback, /auth\.getUser\(\)/u);
  assert.match(adminCallback, /function hasGoogleIdentity/u);
  assert.match(adminCallback, /identity\.provider\?\.trim\(\)\.toLowerCase\(\) === "google"/u);
  assert.doesNotMatch(adminCallback, /auth\.getClaims\(\)|isGoogleAuthProvider/u);
  assert.match(adminCallback, /administrativeOrganization/u);
  assert.match(adminCallback, /vinculo_estimulo_necessario/u);
  assert.match(adminAccess, /ESTIMULO_ORGANIZATION_SLUG = "estimulo"/u);
});

test("AWS production boundaries remain fail-closed while architecture is pending", async () => {
  const [context, proxy, ready, dataGateway, storage] = await Promise.all([
    read("apps/web/lib/auth/context.ts"),
    read("apps/web/proxy.ts"),
    read("apps/web/app/api/health/ready/route.ts"),
    read("apps/web/lib/rpc/authenticated-gateway.ts"),
    read("apps/web/lib/platform/object-storage.ts"),
  ]);
  assert.match(context, /AWS_IDENTITY_ARCHITECTURE_PENDING/u);
  assert.match(proxy, /aws_identity_architecture_pending/u);
  assert.match(ready, /aws_architecture_pending/u);
  assert.match(dataGateway, /AWS_DATA_ARCHITECTURE_PENDING/u);
  assert.match(storage, /AWS_STORAGE_ARCHITECTURE_PENDING/u);
});

test("administrative CMS distinguishes backend outage from an empty workspace", async () => {
  const [page, runtime] = await Promise.all([
    read("apps/web/app/admin/experiencia/page.tsx"),
    read("apps/web/lib/interface-content/runtime.ts"),
  ]);
  assert.match(page, /Interface temporariamente indisponível/u);
  assert.match(page, /Nenhuma alteração foi aplicada/u);
  assert.match(runtime, /interface_content_fallback/u);
  assert.match(runtime, /platformRuntimeProvider\(\) === "aws"/u);
});

test("application shell keeps idempotent submission and separate participant/admin navigation", async () => {
  const [shell, adminShell, participantShell] = await Promise.all([
    read("apps/web/components/app-shell.tsx"),
    read("apps/web/components/admin-shell.tsx"),
    read("apps/web/components/participant-shell.tsx"),
  ]);
  assert.match(shell, /IdempotentSubmitBoundary/u);
  assert.match(shell, /AdminShell/u);
  assert.match(shell, /ParticipantShell/u);
  assert.match(adminShell, /id="conteudo-principal"|main/u);
  assert.match(participantShell, /id="conteudo-principal"|main/u);
});

test("behavioral smoke migrations are content-conditional during structural replay", async () => {
  for (const file of [
    "supabase/migrations/20260726010300_runtime_smoke_validation.sql",
    "supabase/migrations/20260726010400_journey_points_smoke_validation.sql",
    "supabase/migrations/20260726010450_points_smoke_validation.sql",
  ]) {
    const source = await read(file);
    assert.match(source, /fixture is not present during structural replay/u);
    assert.match(source, /raise notice/u);
    assert.match(source, /return;/u);
  }
});
