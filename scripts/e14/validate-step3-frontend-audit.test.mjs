import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../../docs/implementation/', import.meta.url);
const routes = JSON.parse(await readFile(new URL('e14-step3-route-map-v0.1.json', base), 'utf8'));
const components = JSON.parse(await readFile(new URL('e14-step3-component-map-v0.1.json', base), 'utf8'));
const byRoute = new Map(routes.routes.map((item) => [item.route, item]));

test('inventário contém 24 rotas reais sem duplicação', () => {
  assert.equal(routes.routes.length, 24);
  assert.equal(new Set(routes.routes.map((item) => item.route)).size, 24);
});

test('cadastro público e recursos fora da vertical são removidos do runtime', () => {
  for (const route of ['/cadastro', '/entregas', '/certificados', '/prompt-library', '/admin/entregas']) {
    assert.equal(byRoute.get(route).classification, 'REMOVE_FROM_RUNTIME');
  }
});

test('jornada, player e administração de conteúdo são substituídos', () => {
  for (const route of ['/jornada', '/player/[lessonId]', '/cursos', '/admin/cursos', '/admin/aulas', '/admin/relatorios']) {
    assert.equal(byRoute.get(route).classification, 'REPLACE');
  }
});

test('shells, autenticação e dashboard exigem refatoração', () => {
  for (const route of ['/', '/login', '/dashboard', '/pontuacao', '/perfil', '/admin']) {
    assert.equal(byRoute.get(route).classification, 'REFACTOR');
  }
  assert.ok(components.REFACTOR.includes('layout/student-shell'));
  assert.ok(components.REFACTOR.includes('layout/admin-shell'));
  assert.ok(components.REFACTOR.includes('supabase/proxy'));
});

test('schema e fixtures da fundação não entram no domínio privado', () => {
  for (const item of ['database/schema.sql', 'database/seed.sql', 'journey/journey-data', 'journey/progress', 'gamification/rules']) {
    assert.ok(components.REPLACE.includes(item));
  }
});

test('aplicação integrada terá destino apps/web', () => {
  assert.equal(components.target_path, 'apps/web');
});
