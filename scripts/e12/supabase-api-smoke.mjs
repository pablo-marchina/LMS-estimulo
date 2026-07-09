import { writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const output = process.env.SMOKE_REPORT_PATH ?? 'supabase-api-smoke-report.json';

if (!url) {
  console.error('Missing SUPABASE_URL');
  process.exit(2);
}
if (!key) {
  console.error('Missing SUPABASE_PUBLISHABLE_KEY');
  process.exit(2);
}

const tests = [
  { name: 'auth_health', path: '/auth/v1/health', useKey: false },
  { name: 'rest_gateway', path: '/rest/v1/', useKey: true },
  { name: 'storage_status', path: '/storage/v1/status', useKey: true },
];

async function probe(test) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const headers = test.useKey
    ? { apikey: key, Authorization: `Bearer ${key}` }
    : {};

  try {
    const response = await fetch(`${url}${test.path}`, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      name: test.name,
      path: test.path,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      requestId: response.headers.get('x-request-id'),
      bodyPreview: body.slice(0, 300),
    };
  } catch (error) {
    return {
      name: test.name,
      path: test.path,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
for (const test of tests) results.push(await probe(test));

const report = {
  generatedAt: new Date().toISOString(),
  projectUrl: url,
  projectRef: new URL(url).hostname.split('.')[0],
  results,
};

await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

const healthFailed = results.some((result) => result.error);
process.exit(healthFailed ? 1 : 0);
