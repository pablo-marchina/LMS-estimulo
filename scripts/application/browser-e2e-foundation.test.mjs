import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (file) => readFile(resolve(root, file), 'utf8');

test('modo browser E2E é server-only, local e explicitamente habilitado', async () => {
  const config = await read('apps/web/lib/browser-e2e/config.ts');
  const auth = await read('apps/web/lib/auth/context.ts');
  const proxy = await read('apps/web/proxy.ts');
  const sessionRoute = await read('apps/web/app/api/e2e/session/route.ts');
  assert.ok(config.includes('import "server-only"'));
  assert.ok(config.includes('BROWSER_E2E_MODE === "synthetic"'));
  assert.ok(config.includes('hostname === "127.0.0.1"'));
  assert.ok(config.includes('token.length >= 24'));
  assert.ok(auth.includes('browserE2EEnabled()'));
  assert.ok(proxy.includes('localSyntheticSession(request)'));
  assert.ok(proxy.includes('new Set(["127.0.0.1", "localhost", "::1"])'));
  assert.ok(proxy.includes('token.length < 24'));
  assert.ok(sessionRoute.includes('status: 404'));
  assert.ok(sessionRoute.includes('status: 403'));
});

test('browser E2E usa Chrome via CDP sem dependência nova de automação', async () => {
  const rootPackage = JSON.parse(await read('package.json'));
  const webPackage = JSON.parse(await read('apps/web/package.json'));
  const runner = await read('scripts/browser-e2e/run-synthetic-vertical.mjs');
  assert.equal(rootPackage.scripts['test:browser-e2e'], 'node scripts/browser-e2e/run-synthetic-vertical.mjs');
  assert.equal(webPackage.devDependencies?.['@playwright/test'], undefined);
  assert.ok(runner.includes('--remote-debugging-port='));
  assert.ok(runner.includes('DOM.setFileInputFiles'));
  assert.ok(runner.includes('Emulation.setDeviceMetricsOverride'));
  assert.ok(runner.includes('form.requestSubmit();'));
});

test('adaptador sintético preserva contratos e não substitui a camada produtiva', async () => {
  const invoker = await read('apps/web/lib/rpc/server-invoke.ts');
  const synthetic = await read('apps/web/lib/browser-e2e/synthetic-runtime.ts');
  assert.ok(invoker.includes('if (browserE2EEnabled())'));
  assert.ok(invoker.includes('createPrivilegedClient()'));
  assert.ok(synthetic.includes('e14_get_participant_experience'));
  assert.ok(synthetic.includes('create_practice_upload_intent'));
  assert.ok(synthetic.includes('issue_learning_credentials'));
  assert.ok(synthetic.includes('IDEMPOTENCY_KEY_REUSED'));
});
