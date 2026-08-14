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
  assert.match(action, /stagePublicSignupLegalSnapshot/u);
  assert.match(action, /signup_legal_snapshot_token/u);
  assert.doesNotMatch(action, /updateUserById/u);
  assert.doesNotMatch(action, /deleteUser/u);
  assert.doesNotMatch(action, /termsDocumentVersionId:\s*formData\.get\("terms_version"\)/u);
  assert.match(provisioning, /get_signup_legal_documents/u);
  assert.match(provisioning, /stage_public_signup_legal_snapshot/u);
});

test('legacy authenticated accounts can complete onboarding by staging an explicit governed legal snapshot', async () => {
  const [page, action] = await Promise.all([
    read('apps/web/app/cadastro/concluir/page.tsx'),
    read('apps/web/app/cadastro/concluir/actions.ts'),
  ]);

  assert.match(page, /needsLegacyLegalAcceptance/u);
  assert.match(page, /getCurrentSignupLegalSnapshot/u);
  assert.match(page, /terms_document_version_id/u);
  assert.match(page, /privacy_document_version_id/u);
  assert.match(page, /name="terms"[^>]*required/u);
  assert.match(page, /Seu login não foi rejeitado/u);

  assert.match(action, /hasSignupLegalSnapshotToken/u);
  assert.match(action, /getSignupLegalSnapshotByIds/u);
  assert.match(action, /stagePublicSignupLegalSnapshot/u);
  assert.match(action, /signup_legal_snapshot_token:\s*legalSnapshotToken/u);
  assert.match(action, /updateUserById/u);
  assert.match(action, /signup_legal_snapshot_token:\s*null/u);
  assert.match(action, /if \(!hasSignupLegalSnapshotToken\(metadata\)\)/u);
});

test('provisioning persists the staged legal snapshot without widening generic legal_accept', async () => {
  const [migration, participantExtension] = await Promise.all([
    read('supabase/migrations/20260813151000_freeze_signup_legal_snapshot.sql'),
    read('supabase/migrations/20260730211900_perform_participant_extension.sql'),
  ]);

  assert.match(migration, /d\.status in \('published',\s*'retired'\)/u);
  assert.match(migration, /d\.published_at is not null/u);
  assert.match(migration, /public_signup_legal_snapshots/u);
  assert.match(migration, /raw_user_meta_data/u);
  assert.match(migration, /email_normalized/u);
  assert.match(migration, /insert into governance\.legal_acceptances\(/u);
  assert.match(migration, /on conflict\(legal_document_version_id,user_account_id\) do nothing/u);
  assert.match(migration, /'participant_web'/u);
  assert.match(migration, /'signup_snapshot'/u);
  assert.match(migration, /v_signup_snapshot\.terms_document_version_id/u);
  assert.match(migration, /v_signup_snapshot\.privacy_document_version_id/u);
  assert.doesNotMatch(migration, /pg_get_functiondef/u);
  assert.doesNotMatch(migration, /perform public\.perform_participant_extension\(/u);
  assert.match(participantExtension, /when 'legal_accept' then[\s\S]*d\.status='published'/u);
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
