import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  defaultAuthenticatedDestination,
  isAuthorizedDestination,
  isProtectedPath,
  resolveAuthenticatedDestination,
  sanitizeReturnTo
} from "../../apps/web/lib/auth/navigation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

const participant = {
  user_account_id: "user-1",
  entrepreneur_id: "entrepreneur-1",
  organizations: []
};

const operator = {
  user_account_id: "user-2",
  entrepreneur_id: null,
  organizations: [
    {
      organization_id: "organization-1",
      display_name: "Estímulo",
      roles: ["operator"],
      permissions: ["journey.execution.read"]
    }
  ]
};

test("protected paths cover participant and operator areas", () => {
  assert.equal(isProtectedPath("/empreendedor"), true);
  assert.equal(isProtectedPath("/empreendedor/atividade/123"), true);
  assert.equal(isProtectedPath("/capacitacao/jornada-openai"), true);
  assert.equal(isProtectedPath("/admin"), true);
  assert.equal(isProtectedPath("/entrar"), false);
});

test("return destinations remain internal and avoid authentication loops", () => {
  assert.equal(sanitizeReturnTo("/empreendedor/atividade/123?origem=site"), "/empreendedor/atividade/123?origem=site");
  assert.equal(sanitizeReturnTo("https://example.com"), null);
  assert.equal(sanitizeReturnTo("//example.com"), null);
  assert.equal(sanitizeReturnTo("/\\example.com"), null);
  assert.equal(sanitizeReturnTo("/entrar?returnTo=/admin"), null);
  assert.equal(sanitizeReturnTo("/cadastro"), null);
});

test("authenticated participants keep valid direct destinations", () => {
  assert.equal(isAuthorizedDestination(participant, "/empreendedor/atividade/123"), true);
  assert.equal(
    resolveAuthenticatedDestination(participant, "/empreendedor/atividade/123?origem=site"),
    "/empreendedor/atividade/123?origem=site"
  );
  assert.equal(resolveAuthenticatedDestination(participant, "/admin"), "/empreendedor");
  assert.equal(defaultAuthenticatedDestination(participant), "/empreendedor");
});

test("authenticated operators keep only destinations for accessible organizations", () => {
  assert.equal(isAuthorizedDestination(operator, "/admin?organization=organization-1"), true);
  assert.equal(resolveAuthenticatedDestination(operator, "/admin"), "/admin?organization=organization-1");
  assert.equal(isAuthorizedDestination(operator, "/admin?organization=organization-2"), false);
  assert.equal(
    resolveAuthenticatedDestination(operator, "/admin?organization=organization-1&instance=journey-1"),
    "/admin?organization=organization-1&instance=journey-1"
  );
  assert.equal(
    resolveAuthenticatedDestination(operator, "/admin?organization=organization-2"),
    "/admin?organization=organization-1"
  );
});

test("application entry points use the shared destination policy", async () => {
  const [proxy, home, signInPage, signInAction] = await Promise.all([
    read("apps/web/proxy.ts"),
    read("apps/web/app/page.tsx"),
    read("apps/web/app/entrar/page.tsx"),
    read("apps/web/app/entrar/actions.ts")
  ]);

  assert.match(proxy, /isProtectedPath/);
  assert.match(proxy, /searchParams\.set\("returnTo"/);
  assert.match(proxy, /matcher: \["\/", "\/entrar"/);
  assert.match(home, /defaultAuthenticatedDestination/);
  assert.match(signInPage, /resolveAuthenticatedDestination/);
  assert.match(signInPage, /name="returnTo"/);
  assert.match(signInAction, /signInErrorPath/);
  assert.match(signInAction, /resolveAuthenticatedDestination/);
});
