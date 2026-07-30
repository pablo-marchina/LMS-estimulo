import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runtime = await readFile("apps/web/lib/admin/role-management.ts", "utf8");
const actions = await readFile("apps/web/app/admin/usuarios/actions.ts", "utf8");
const page = await readFile("apps/web/app/admin/usuarios/page.tsx", "utf8");
const adminShell = await readFile("apps/web/components/admin-shell.tsx", "utf8");

test("role management remains server-only and uses audited RPCs", () => {
  assert.match(runtime, /import "server-only"/u);
  assert.match(runtime, /list_organization_role_management/u);
  assert.match(runtime, /grant_organization_role/u);
  assert.match(runtime, /revoke_organization_role/u);
  assert.doesNotMatch(runtime, /bootstrap_organization_role_manager/u);
});

test("role actions require explicit permission, UUID validation and typed confirmations", () => {
  assert.match(actions, /iam\.memberships\.manage/u);
  assert.match(actions, /z\.string\(\)\.uuid\(\)/u);
  assert.match(actions, /confirmation\("CONCEDER"\)/u);
  assert.match(actions, /confirmation\("REMOVER"\)/u);
  assert.match(actions, /ROLE_MANAGEMENT_FORBIDDEN/u);
  assert.match(actions, /validUntil:\s*null/u);
  assert.doesNotMatch(actions, /@estimulo\.org/u);
});

test("admin page exposes permission-gated and accessible grant and revoke controls", () => {
  assert.match(page, /organization\.permissions\.includes\("iam\.memberships\.manage"\)/u);
  assert.match(page, /Confirme digitando REMOVER/u);
  assert.match(page, /Confirme digitando CONCEDER/u);
  assert.match(page, /Usuários indisponíveis/u);
  assert.match(page, /Somente consulta/u);
  assert.match(adminShell, /\/admin\/usuarios/u);
});
