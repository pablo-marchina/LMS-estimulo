import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtime = await readFile("apps/web/lib/admin/role-management.ts", "utf8");
const actions = await readFile("apps/web/app/admin/usuarios/actions.ts", "utf8");
const page = await readFile("apps/web/app/admin/usuarios/page.tsx", "utf8");
const shell = await readFile("apps/web/components/app-shell.tsx", "utf8");

test("role management remains server-only and uses the audited RPCs", () => {
  assert.match(runtime, /import "server-only"/u);
  assert.match(runtime, /list_organization_role_management/u);
  assert.match(runtime, /grant_organization_role/u);
  assert.match(runtime, /revoke_organization_role/u);
  assert.doesNotMatch(runtime, /bootstrap_organization_role_manager/u);
});

test("role actions require explicit permission and typed confirmations", () => {
  assert.match(actions, /iam\.memberships\.manage/u);
  assert.match(actions, /confirmation\("CONCEDER"\)/u);
  assert.match(actions, /confirmation\("REMOVER"\)/u);
  assert.match(actions, /ROLE_MANAGEMENT_FORBIDDEN/u);
  assert.match(actions, /-03:00/u);
  assert.doesNotMatch(actions, /@estimulo\.org/u);
});

test("admin page explains explicit grants and exposes accessible controls", () => {
  assert.match(page, /independentes do domínio do e-mail/u);
  assert.match(page, /Digite REMOVER/u);
  assert.match(page, /Digite CONCEDER/u);
  assert.match(page, /horário de Brasília/u);
  assert.match(page, /datetime-local/u);
  assert.match(shell, /\/admin\/usuarios/u);
});
