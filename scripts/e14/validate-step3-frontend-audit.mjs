import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../../docs/implementation/', import.meta.url);
const summary = JSON.parse(await readFile(new URL('e14-step3-summary.json', base), 'utf8'));
const routes = JSON.parse(await readFile(new URL('e14-step3-route-map-v0.1.json', base), 'utf8'));
const components = JSON.parse(await readFile(new URL('e14-step3-component-map-v0.1.json', base), 'utf8'));

assert.equal(summary.artifact, 'e14_step3_frontend_review');
assert.equal(summary.status, 'DONE');
assert.equal(summary.target_path, 'apps/web');
assert.equal(routes.routes.length, 24);
assert.equal(new Set(routes.routes.map((item) => item.route)).size, 24);
assert.equal(routes.admin_anchor_placeholders.length, 5);

const counts = routes.routes.reduce((acc, item) => {
  acc[item.classification] = (acc[item.classification] ?? 0) + 1;
  return acc;
}, {});
assert.deepEqual(counts, {
  REFACTOR: 8,
  REMOVE_FROM_RUNTIME: 10,
  REPLACE: 6
});
assert.deepEqual(routes.counts, {
  total: 24,
  KEEP: 0,
  REFACTOR: 8,
  REPLACE: 6,
  REMOVE_FROM_RUNTIME: 10
});

for (const required of ['/login', '/dashboard', '/jornada', '/player/[lessonId]', '/admin', '/admin/relatorios']) {
  assert.ok(routes.routes.some((item) => item.route === required));
}
assert.equal(routes.routes.find((item) => item.route === '/cadastro').classification, 'REMOVE_FROM_RUNTIME');
assert.equal(routes.routes.find((item) => item.route === '/player/[lessonId]').classification, 'REPLACE');

for (const group of ['KEEP', 'REFACTOR', 'REPLACE']) {
  assert.ok(Array.isArray(components[group]) && components[group].length > 0);
}
assert.equal(components.target_path, 'apps/web');
assert.ok(components.REPLACE.includes('database/schema.sql'));
assert.ok(components.REFACTOR.includes('supabase/proxy'));

console.log(JSON.stringify({
  status: 'ok',
  artifact: summary.artifact,
  routes: routes.routes.length,
  admin_anchor_placeholders: routes.admin_anchor_placeholders.length,
  classifications: routes.counts,
  reusable_components: components.KEEP.length,
  refactor_components: components.REFACTOR.length,
  replace_components: components.REPLACE.length,
  target_path: summary.target_path
}, null, 2));
