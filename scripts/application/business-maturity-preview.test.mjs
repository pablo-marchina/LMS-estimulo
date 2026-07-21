import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [runtime, page, migration] = await Promise.all([
  readFile("apps/web/lib/admin/maturity-preview.ts", "utf8"),
  readFile("apps/web/app/admin/maturidade/page.tsx", "utf8"),
  readFile("supabase/migrations/20260720183500_business_maturity_preview_api.sql", "utf8"),
]);

test("maturity preview runtime is server-only and uses the permissioned read RPC", () => {
  assert.match(runtime, /import "server-only"/u);
  assert.match(runtime, /invokeServerRpc/u);
  assert.match(runtime, /get_business_maturity_draft/u);
  assert.match(migration, /diagnostic\.configuration\.manage/u);
  assert.match(migration, /revoke all on function public\.get_business_maturity_draft/u);
  assert.match(migration, /from public,anon,authenticated/u);
});

test("admin maturity page requires explicit permission and stays non-persistent", () => {
  assert.match(page, /permissions\.includes\("diagnostic\.configuration\.manage"\)/u);
  assert.match(page, /method="get"/u);
  assert.match(page, /Simular cálculo sem persistência/u);
  assert.match(page, /não atribui nível/u);
  assert.match(page, /não envia dados ao HubSpot/u);
  assert.doesNotMatch(page, /"use server"|form action=|insert|update|publish|segment_assignments/iu);
});

test("maturity preview exposes governance blockers and credit prohibition", () => {
  assert.match(page, /Ativação bloqueada/u);
  assert.match(page, /Uso em crédito/u);
  assert.match(page, /Pendências para homologação/u);
  assert.match(page, /Aprovação jurídica e de privacidade/u);
  assert.match(page, /Revisão de equidade e vieses/u);
});
