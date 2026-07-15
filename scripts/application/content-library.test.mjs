import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (file) => readFile(resolve(root, file), 'utf8');

test('biblioteca possui catálogo, detalhe e administração mínima', async () => {
  for (const file of [
    'apps/web/app/capacitacao/biblioteca/page.tsx',
    'apps/web/app/capacitacao/biblioteca/[slug]/page.tsx',
    'apps/web/app/admin/biblioteca/page.tsx',
    'apps/web/app/api/library/access/route.ts',
  ]) assert.ok((await read(file)).length > 100);
});

test('busca permanece em PostgreSQL full-text sem embeddings', async () => {
  const schema = await read('scripts/database/content-library/schema.sql');
  const api = await read('scripts/database/content-library/api.sql');
  assert.ok(schema.includes('search_document tsvector generated always'));
  assert.ok(schema.includes('using gin(search_document)'));
  assert.ok(api.includes("websearch_to_tsquery('pg_catalog.portuguese'"));
  assert.ok(api.includes('ts_rank_cd'));
  assert.ok(!schema.toLowerCase().includes('vector('));
  assert.ok(!api.toLowerCase().includes('embedding'));
});

test('runtime da biblioteca é server-only e usa o invocador central', async () => {
  const runtime = await read('apps/web/lib/library/runtime.ts');
  assert.ok(runtime.includes('import "server-only"'));
  assert.ok(runtime.includes('invokeServerRpc'));
  assert.ok(runtime.includes('list_library_content'));
  assert.ok(runtime.includes('record_library_content_access'));
});

test('conteúdo externo passa por ação rastreada e exige HTTPS', async () => {
  const actions = await read('apps/web/app/actions/library.ts');
  const detail = await read('apps/web/app/capacitacao/biblioteca/[slug]/page.tsx');
  assert.ok(actions.includes('startsWith("https://")'));
  assert.ok(actions.includes('recordAccess'));
  assert.ok(detail.includes('openLibraryContentAction'));
  assert.ok(!detail.includes('href={content.external_url}'));
});

test('visualização usa beacon same-origin com chave por sessão', async () => {
  const tracker = await read('apps/web/components/library-access-tracker.tsx');
  const route = await read('apps/web/app/api/library/access/route.ts');
  assert.ok(tracker.includes('sessionStorage'));
  assert.ok(tracker.includes('crypto.randomUUID()'));
  assert.ok(route.includes('sameOrigin'));
  assert.ok(route.includes('action: "view"'));
});

test('biblioteca está protegida e aparece na navegação', async () => {
  const proxy = await read('apps/web/proxy.ts');
  const shell = await read('apps/web/components/app-shell.tsx');
  assert.ok(proxy.includes('/capacitacao'));
  assert.ok(shell.includes('/capacitacao/biblioteca'));
  assert.ok(shell.includes('/admin/biblioteca'));
});
