import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isValidCpf, normalizeCpf, protectCpfWithKeys } from "../../apps/web/lib/identity/cpf-core.mjs";

const [adminEmailPolicy, adminLayout, participantSignIn, adminSignIn, adminCallback, completionPage, completionAction, migration, hubSpotPolicy] = await Promise.all([
  readFile("apps/web/lib/auth/administrative-email.ts", "utf8"),
  readFile("apps/web/app/admin/layout.tsx", "utf8"),
  readFile("apps/web/app/entrar/actions.ts", "utf8"),
  readFile("apps/web/app/entrar/administracao/actions.ts", "utf8"),
  readFile("apps/web/app/auth/admin/callback/route.ts", "utf8"),
  readFile("apps/web/app/cadastro/concluir/page.tsx", "utf8"),
  readFile("apps/web/app/cadastro/concluir/actions.ts", "utf8"),
  readFile("supabase/migrations/20260720190000_protected_cpf_signup.sql", "utf8"),
  readFile("apps/web/lib/hubspot/sync-policy.ts", "utf8"),
]);

test("administrative entry requires Google, the exact Estímulo domain and active RBAC", () => {
  assert.match(adminEmailPolicy, /ESTIMULO_ADMIN_DOMAIN = "estimulo\.org"/u);
  assert.match(adminEmailPolicy, /email\.slice\(separator \+ 1\) === ESTIMULO_ADMIN_DOMAIN/u);
  assert.match(adminSignIn, /provider:\s*"google"/u);
  assert.match(adminSignIn, /hd:\s*"estimulo\.org"/u);
  assert.match(adminCallback, /isGoogleAuthProvider\(user\)/u);
  assert.match(adminCallback, /isEstimuloAdministrativeEmail\(email\)/u);
  assert.match(adminCallback, /administrativeOrganization\(auth\.identity\)/u);
  assert.match(adminCallback, /client\.auth\.signOut/u);
  assert.match(adminLayout, /auth\.provider !== "google"/u);
  assert.match(adminLayout, /administrativeOrganization\(auth\.identity\)/u);
  assert.match(participantSignIn, /isEstimuloAdministrativeEmail\(email\)/u);
  assert.doesNotMatch(participantSignIn, /grant|membership_roles|organization_memberships/u);
});

test("CPF normalization and check digits reject malformed identifiers", () => {
  assert.equal(normalizeCpf("529.982.247-25"), "52998224725");
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("168.995.350-09"), true);
  assert.equal(isValidCpf("529.982.247-24"), false);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("123"), false);
});

test("CPF protection uses independent AES-GCM and HMAC keys without retaining the raw value", () => {
  const encryptionKey = Buffer.alloc(32, 7).toString("base64");
  const lookupKey = Buffer.alloc(32, 9).toString("base64");
  const accountId = "00000000-0000-4000-8000-000000000001";
  const first = protectCpfWithKeys("529.982.247-25", accountId, encryptionKey, lookupKey, Buffer.alloc(12, 1));
  const second = protectCpfWithKeys("52998224725", accountId, encryptionKey, lookupKey, Buffer.alloc(12, 2));

  assert.equal(first.lookupHmac, second.lookupHmac, "lookup token must be stable for deduplication");
  assert.notEqual(first.ciphertext, second.ciphertext, "ciphertext must change with a new IV");
  assert.match(first.lookupHmac, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(first).includes("52998224725"), false);
  assert.equal(first.keyVersion, 1);
});

test("verified signup requires CPF and sends only a protected payload to the RPC", () => {
  assert.match(completionPage, /name="cpf"/u);
  assert.match(completionPage, /CPF é obrigatório/u);
  assert.match(completionAction, /protectCpf\(parsed\.data\.cpf/u);
  assert.match(completionAction, /protectedCpf/u);
  assert.doesNotMatch(completionAction, /user_metadata[\s\S]*cpf|searchParams[\s\S]*cpf|console\./u);
  assert.match(migration, /create table if not exists iam\.user_cpf_identifiers/u);
  assert.match(migration, /lookup_hmac text not null unique/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /revoke all on table iam\.user_cpf_identifiers from public,anon,authenticated/u);
  assert.doesNotMatch(migration, /cpf_raw|cpf_normalized|payload'.*cpf_lookup_hmac/su);
});

test("HubSpot remains restricted to the three approved classes", () => {
  assert.match(hubSpotPolicy, /"identity\.cpf": \{ classification: "linking_identifier"/u);
  assert.match(hubSpotPolicy, /classification: "engagement_signal"/u);
  assert.match(hubSpotPolicy, /classification: "not_synced"/u);
  assert.match(hubSpotPolicy, /blocked_pending_hubspot_destination_inventory/u);
  assert.doesNotMatch(hubSpotPolicy, /classification: "raw_payload"|classification: "full_mirror"/u);
});
