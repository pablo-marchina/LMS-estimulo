import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [gamification, home, header, experience, selector, catalog, users, roleTypes, migration] = await Promise.all([
  read("apps/web/app/admin/gamificacao/page.tsx"),
  read("apps/web/app/empreendedor/page.tsx"),
  read("apps/web/components/ui/page-header.tsx"),
  read("apps/web/app/admin/experiencia/page.tsx"),
  read("apps/web/app/admin/experiencia/visual-interface-selector.tsx"),
  read("apps/web/lib/interface-content/route-catalog.ts"),
  read("apps/web/app/admin/usuarios/page.tsx"),
  read("apps/web/lib/admin/role-management.ts"),
  read("supabase/migrations/20260806120000_admin_interface_and_user_directory_completeness.sql"),
]);

test("admin point screen does not depend on optional badge highlights", () => {
  assert.match(gamification, /const type = .*query\.tipo/u);
  assert.match(gamification, /type === "selos"[\s\S]*adminHomeBadgeHighlights/u);
  assert.match(gamification, /\.catch\(\(\) => null\)/u);
  assert.doesNotMatch(gamification, /Promise\.all\(\[[\s\S]*adminHomeBadgeHighlights/u);
});

test("participant home only raises the global warning for core data", () => {
  assert.match(home, /coreDataUnavailable/u);
  assert.match(home, /results\[0\]\.status === "rejected" \|\| results\[2\]\.status === "rejected"/u);
  assert.doesNotMatch(home, /Algumas informações não puderam ser atualizadas/u);
});

test("page headers are compact unless media explicitly needs height", () => {
  assert.match(header, /layoutVariant/u);
  assert.match(header, /p-4 sm:p-5/u);
  assert.match(header, /hasMedia && layoutVariant === "hero"/u);
  assert.match(header, /hasMedia && layoutVariant === "hero" \? \(participant \? "min-h-40 sm:min-h-44"/u);
});

test("interface administration catalogs every platform area with preview and specifications", () => {
  for (const route of [
    "/admin/usuarios", "/admin/relatorios", "/admin/recompensas", "/admin/campanhas", "/admin/b2b",
    "/empreendedor/recompensas", "/empreendedor/perfil/entregas", "/ajuda", "/privacidade", "/termos",
  ]) assert.match(catalog, new RegExp(route.replaceAll("/", "\\/"), "u"));
  assert.match(catalog, /\/auth\/confirm/u);
  assert.match(catalog, /\/confirm/u);
  assert.doesNotMatch(catalog, /\/empreendedor\/pontuacao/u);
  assert.match(selector, /Cobertura da interface/u);
  assert.match(selector, /Especificações da seção/u);
  assert.match(selector, /Administrador/u);
  assert.match(selector, /Participante/u);
  assert.match(selector, /Público/u);
  assert.match(experience, /Especificações e alcance/u);
  assert.match(experience, /Adicionar elemento a qualquer seção/u);
  assert.match(experience, /Densidade ou layout/u);
  assert.match(experience, /novos blocos entram apenas nos espaços seguros/u);
  assert.doesNotMatch(experience, /CMS temporariamente indisponível/u);
});

test("admin user directory includes active accounts without memberships", () => {
  assert.match(roleTypes, /membership_id: string \| null/u);
  assert.match(roleTypes, /account_status: string/u);
  assert.match(users, /Sem vínculo/u);
  assert.match(users, /membership\.user_account_id/u);
  assert.match(migration, /from iam\.user_accounts account/u);
  assert.match(migration, /left join lateral/u);
  assert.match(migration, /coalesce\(directory\.membership_status,'unlinked'\)/u);
  assert.match(migration, /organization\.slug='estimulo'/u);
  assert.match(migration, /journey_definition\.owner_organization_id=p_organization_id/u);
});
