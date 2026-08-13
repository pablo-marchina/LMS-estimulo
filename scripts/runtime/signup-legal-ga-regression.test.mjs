import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('public signup freezes governed legal document ids instead of client supplied dates', async () => {
  const [page, action, provisioning] = await Promise.all([
    read('apps/web/app/cadastro/page.tsx'),
    read('apps/web/app/cadastro/actions.ts'),
    read('apps/web/lib/auth/public-signup-provisioning.ts'),
  ]);

  assert.match(page, /terms_document_version_id/u);
  assert.match(page, /privacy_document_version_id/u);
  assert.doesNotMatch(page, /name="terms_version"/u);
  assert.doesNotMatch(page, /name="privacy_version"/u);
  assert.match(action, /signup_legal_snapshot/u);
  assert.match(action, /app_metadata/u);
  assert.doesNotMatch(action, /termsDocumentVersionId:\s*formData\.get\("terms_version"\)/u);
  assert.match(provisioning, /get_signup_legal_documents/u);
});

test('provisioning persists the sealed signup snapshot through legal_accept even after retirement', async () => {
  const migration = await read('supabase/migrations/20260813151000_freeze_signup_legal_snapshot.sql');

  assert.match(migration, /d\.status in \('published','retired'\) and d\.published_at is not null/u);
  assert.match(migration, /raw_app_meta_data/u);
  assert.match(migration, /'signup_legal_snapshot'/u);
  assert.match(migration, /perform public\.perform_participant_extension\(/u);
  assert.match(migration, /'legal_accept'/u);
  assert.match(migration, /'signup-legal:' \|\| v_terms_document_id::text/u);
  assert.match(migration, /'signup-legal:' \|\| v_privacy_document_id::text/u);
});

test('public terms page renders the governed legal document body', async () => {
  const termsPage = await read('apps/web/app/termos/page.tsx');
  assert.match(termsPage, /getPublicSignupLegalDocument\("terms_of_use"/u);
  assert.match(termsPage, /legalDocument\.body/u);
  assert.doesNotMatch(termsPage, /Versão operacional de 29 de julho de 2026/u);
});

test('production CSP admits the GA4 script and collection endpoints without Ads domains', async () => {
  const config = await read('apps/web/next.config.ts');

  assert.match(config, /script-src[^\n]*https:\/\/\*\.googletagmanager\.com/u);
  assert.match(config, /connect-src[^\n]*https:\/\/\*\.google-analytics\.com/u);
  assert.match(config, /connect-src[^\n]*https:\/\/\*\.analytics\.google\.com/u);
  assert.match(config, /connect-src[^\n]*https:\/\/\*\.googletagmanager\.com/u);
  assert.doesNotMatch(config, /doubleclick\.net/u);
  assert.doesNotMatch(config, /googlesyndication\.com/u);
});
