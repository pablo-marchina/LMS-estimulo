# Frente 1 (parte A) — Telefone/CNPJ + motor de decisão de identidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect telefone and CNPJ (opcional) during participant signup completion, and ship a fully-tested, pure identity-matching decision engine (single/no-match/multiple/conflict) that can classify candidate identity records — without yet wiring it to live HubSpot search, which is blocked on sandbox access (see Deferred Scope below).

**Architecture:** Extends the existing, already-tested public-signup flow (`/cadastro/concluir`) by adding two new form fields and a new versioned provisioning RPC (`provision_public_signup_participant_v3`, wrapping the existing `_v2`) that stores them on `core.entrepreneurs`/`core.businesses`. Separately, adds a standalone, dependency-free TypeScript module implementing the match-state decision logic described in `docs/architecture/IDENTITY_BRIDGE.md`, unit-tested in isolation so it is ready to consume real candidates the moment a HubSpot search capability exists (a follow-up plan).

**Tech Stack:** Next.js 16 / React 19 server actions, Zod 4, Supabase Postgres (plpgsql RPCs, `security definer`), Node's built-in `node:test` runner, `psql`-driven SQL test gates (this repo's existing pattern, no Jest/Vitest).

## Global Constraints

- Never write the raw CPF (already enforced) — this plan does not touch CPF handling, only adds phone/CNPJ alongside it.
- Telefone and CNPJ are **not** classified as sensitive like CPF (no AES/HMAC) — CNPJ is Brazilian public business-registry data, phone is ordinary contact data. Store as validated plain text.
- Every new RPC must be added to `allowedRpcs` in `supabase/functions/authenticated-rpc/index.ts` and use the `p_actor_user_account_id` argument-name convention (checked against the caller's resolved identity) unless it is a wrapper called from another server-only module rather than directly from the client (see Task 2 note).
- Follow the repo's existing versioning convention: never edit an already-applied migration; add a new file with a later timestamp (`YYYYMMDDHHMMSS_description.sql`).
- No placeholders, no "handle errors appropriately" — every step below is complete, runnable code.
- Public-facing copy is in Portuguese (pt-BR), matching all existing user-facing strings in this codebase.
- Low-tech-literacy audience: error messages use plain language, never technical codes, matching the existing `errorMessages` maps in `/cadastro/concluir/page.tsx`.

## Deferred Scope (explicitly NOT in this plan)

- **Live HubSpot contact search/create.** Confirmed by reading `apps/web/lib/hubspot/{gateway,http-adapter-core,in-memory-adapter}.ts` in full: the gateway only supports read/write of an **already-known** object ID (HTTP adapter's `write()` is `PATCH` by ID, not `POST` create; `read()` requires a numeric ID, no search-by-property). HubSpot's Search API (`POST /crm/v3/objects/contacts/search`) and Create API (`POST /crm/v3/objects/contacts`) are not implemented anywhere in this repo. Building them now would mean testing invented behavior against a mock of an external API we cannot exercise for real (HubSpot sandbox access is confirmed pending). This is real engineering work for a **follow-up plan**, once sandbox access exists.
- **The "identidades pendentes de resolução" queue + admin UI.** Also deferred to a follow-up plan (**Plan 1b**), because it is the natural consumer of Task 4's decision engine fed by *real* candidates — and today the only real candidate source is internal (this repo's own `iam.user_cpf_identifiers` + `core.entrepreneurs.email_normalized`), not HubSpot. Plan 1b will wire Task 4's engine against an internal-duplicate lookup at the `/cadastro/concluir` step, and build the admin queue to resolve internally-flagged ambiguous cases. This plan stops at "the engine exists, is correct, and is unit-tested" so Plan 1b can consume it immediately without re-deriving the logic.
- **`admin/usuarios`** is NOT the right home for any future identity queue — verified by reading the whole file: it is exclusively organizational **staff role grant/revoke** (`roleManagementRuntime`, `iam.memberships.manage`), unrelated to participant/entrepreneur records. Plan 1b will need a new admin route, not a tab bolted onto this page.

## File Structure

- `apps/web/lib/identity/phone-br.mjs` (new) — pure Brazilian phone normalize/validate. No dependencies.
- `apps/web/lib/identity/phone-br.d.mts` (new) — hand-written type declarations, matching the existing `cpf-core.d.mts` pattern.
- `apps/web/lib/identity/cnpj-core.mjs` (new) — pure CNPJ normalize/validate (check-digit algorithm). No dependencies.
- `apps/web/lib/identity/cnpj-core.d.mts` (new) — type declarations.
- `scripts/application/contact-details.test.mjs` (new) — `node:test` unit tests for both modules above, following the static-assertion style of `scripts/application/identity-policy.test.mjs`.
- `supabase/migrations/20260723120000_participant_contact_details.sql` (new) — adds `core.entrepreneurs.phone_e164`, `core.businesses.cnpj` columns, and `provision_public_signup_participant_v3` RPC.
- `scripts/database/participant-contact-details/run.mjs` (new) — psql test runner, mirrors `scripts/database/identity-experience/run.mjs`.
- `scripts/database/participant-contact-details/test-participant-contact-details.sql` (new) — SQL assertions for the new RPC.
- `apps/web/lib/auth/public-signup-provisioning.ts` (modify) — extend `provisionPublicSignupParticipant` to accept and forward `phoneE164`/`cnpj`, call `_v3` instead of `_v2`.
- `apps/web/app/cadastro/concluir/actions.ts` (modify) — add `telefone`/`cnpj` to the Zod schema, validate via the new modules, pass through.
- `apps/web/app/cadastro/concluir/page.tsx` (modify) — add the two form fields and their error messages.
- `package.json` (modify, repo root) — add `test:participant-contact-details` script and wire it into `test:database-gates`.
- `apps/web/lib/identity/hubspot-match.ts` (new) — the pure identity-matching decision engine (Task 4).
- `scripts/application/hubspot-match.test.mjs` (new) — full unit test suite for the engine.

---

### Task 1: Brazilian phone number — normalize and validate

**Files:**
- Create: `apps/web/lib/identity/phone-br.mjs`
- Create: `apps/web/lib/identity/phone-br.d.mts`
- Test: `scripts/application/contact-details.test.mjs` (phone section)

**Interfaces:**
- Produces: `normalizePhoneBr(value: string): string` (returns digits only, without country code), `isValidPhoneBr(value: string): boolean`, `toE164Br(value: string): string` (throws `Error("PHONE_INVALID")` if invalid; returns e.g. `"+5511912345678"`).

- [ ] **Step 1: Write the failing test**

Create `scripts/application/contact-details.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { isValidPhoneBr, normalizePhoneBr, toE164Br } from "../../apps/web/lib/identity/phone-br.mjs";

test("normalizePhoneBr strips formatting and any leading country code", () => {
  assert.equal(normalizePhoneBr("(11) 91234-5678"), "11912345678");
  assert.equal(normalizePhoneBr("+55 11 91234-5678"), "11912345678");
  assert.equal(normalizePhoneBr("1132345678"), "1132345678");
});

test("isValidPhoneBr accepts 10-digit landline and 11-digit mobile starting with 9", () => {
  assert.equal(isValidPhoneBr("(11) 3234-5678"), true);
  assert.equal(isValidPhoneBr("(11) 91234-5678"), true);
  assert.equal(isValidPhoneBr("(11) 81234-5678"), false, "11-digit number must start with 9");
  assert.equal(isValidPhoneBr("123"), false);
  assert.equal(isValidPhoneBr(""), false);
});

test("toE164Br formats a valid number and rejects an invalid one", () => {
  assert.equal(toE164Br("(11) 91234-5678"), "+5511912345678");
  assert.throws(() => toE164Br("123"), /PHONE_INVALID/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/contact-details.test.mjs`
Expected: FAIL — `Cannot find module '../../apps/web/lib/identity/phone-br.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/identity/phone-br.mjs`:

```js
const COUNTRY_CODE = "55";

export function normalizePhoneBr(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith(COUNTRY_CODE) && digits.length > 11) {
    return digits.slice(COUNTRY_CODE.length);
  }
  return digits;
}

export function isValidPhoneBr(value) {
  const normalized = normalizePhoneBr(value);
  if (normalized.length === 10) return true;
  if (normalized.length === 11) return normalized[2] === "9";
  return false;
}

export function toE164Br(value) {
  if (!isValidPhoneBr(value)) throw new Error("PHONE_INVALID");
  return `+${COUNTRY_CODE}${normalizePhoneBr(value)}`;
}
```

Create `apps/web/lib/identity/phone-br.d.mts`:

```ts
export declare function normalizePhoneBr(value: string): string;
export declare function isValidPhoneBr(value: string): boolean;
export declare function toE164Br(value: string): string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/application/contact-details.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/identity/phone-br.mjs apps/web/lib/identity/phone-br.d.mts scripts/application/contact-details.test.mjs
git commit -m "feat(identity): add Brazilian phone normalization and validation"
```

---

### Task 2: CNPJ — normalize and validate

**Files:**
- Create: `apps/web/lib/identity/cnpj-core.mjs`
- Create: `apps/web/lib/identity/cnpj-core.d.mts`
- Test: `scripts/application/contact-details.test.mjs` (append CNPJ section)

**Interfaces:**
- Produces: `normalizeCnpj(value: string): string` (14-digit string), `isValidCnpj(value: string): boolean`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/application/contact-details.test.mjs`:

```js
import { isValidCnpj, normalizeCnpj } from "../../apps/web/lib/identity/cnpj-core.mjs";

test("normalizeCnpj strips formatting", () => {
  assert.equal(normalizeCnpj("11.222.333/0001-81"), "11222333000181");
});

test("isValidCnpj validates check digits and rejects repeated-digit sequences", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11.222.333/0001-82"), false, "wrong check digit must fail");
  assert.equal(isValidCnpj("11.111.111/1111-11"), false, "all-repeated digits must fail");
  assert.equal(isValidCnpj("123"), false, "wrong length must fail");
});
```

(Add the new `import` line next to the existing `phone-br.mjs` import at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/contact-details.test.mjs`
Expected: FAIL — `Cannot find module '../../apps/web/lib/identity/cnpj-core.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/identity/cnpj-core.mjs`:

```js
const CNPJ_DIGITS = 14;
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeCnpj(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function checkDigit(digits, weights) {
  const sum = digits.reduce((total, digit, index) => total + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value) {
  const normalized = normalizeCnpj(value);
  if (normalized.length !== CNPJ_DIGITS || /^(\d)\1{13}$/.test(normalized)) return false;
  const digits = [...normalized].map(Number);
  const firstDigit = checkDigit(digits.slice(0, 12), FIRST_WEIGHTS);
  const secondDigit = checkDigit(digits.slice(0, 13), SECOND_WEIGHTS);
  return firstDigit === digits[12] && secondDigit === digits[13];
}
```

Create `apps/web/lib/identity/cnpj-core.d.mts`:

```ts
export declare function normalizeCnpj(value: string): string;
export declare function isValidCnpj(value: string): boolean;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/application/contact-details.test.mjs`
Expected: PASS (7 tests total)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/identity/cnpj-core.mjs apps/web/lib/identity/cnpj-core.d.mts scripts/application/contact-details.test.mjs
git commit -m "feat(identity): add CNPJ normalization and check-digit validation"
```

---

### Task 3: Store phone/CNPJ — migration + `_v3` provisioning RPC

**Files:**
- Create: `supabase/migrations/20260723120000_participant_contact_details.sql`
- Create: `scripts/database/participant-contact-details/run.mjs`
- Create: `scripts/database/participant-contact-details/test-participant-contact-details.sql`
- Modify: `package.json` (repo root)

**Interfaces:**
- Consumes: `core.entrepreneurs` (id, user_account_id, ...), `core.businesses` (id, ...) from `supabase/migrations/20260720181500_public_signup.sql`; `public.provision_public_signup_participant_v2(uuid,text,text,jsonb,text,text,text,text,integer,text)` from `supabase/migrations/20260720190000_protected_cpf_signup.sql`.
- Produces: `public.provision_public_signup_participant_v3(p_user_account_id uuid, p_preferred_name text, p_business_name text, p_attribution jsonb, p_cpf_lookup_hmac text, p_cpf_ciphertext_base64 text, p_cpf_initialization_vector_base64 text, p_cpf_authentication_tag_base64 text, p_cpf_key_version integer, p_phone_e164 text, p_cnpj text, p_idempotency_key text) returns jsonb` — same result shape as `_v2` plus `phone_status` and `cnpj_status` keys.

- [ ] **Step 1: Write the failing SQL test**

Create `scripts/database/participant-contact-details/test-participant-contact-details.sql`:

```sql
begin;

do $$
declare
  v_user_account_id uuid := gen_random_uuid();
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_business_id uuid;
  v_stored_phone text;
  v_stored_cnpj text;
begin
  insert into iam.user_accounts(id, email_normalized, status)
  values (v_user_account_id, 'contato-teste@estimulo.org', 'active');

  v_result := public.provision_public_signup_participant_v3(
    v_user_account_id, 'Maria Teste', 'Negócio Teste', '{}'::jsonb,
    encode(sha256('lookup-1'::bytea), 'hex'), 'ciphertext-1234', 'iv-1234567890ab', 'tag-12345678901234',
    1, '+5511912345678', '11222333000181', 'test-contact-details-1'
  );

  v_entrepreneur_id := (v_result->>'entrepreneur_id')::uuid;
  v_business_id := (v_result->>'business_id')::uuid;

  select phone_e164 into v_stored_phone from core.entrepreneurs where id = v_entrepreneur_id;
  assert v_stored_phone = '+5511912345678', 'phone must be stored on the entrepreneur record';

  select cnpj into v_stored_cnpj from core.businesses where id = v_business_id;
  assert v_stored_cnpj = '11222333000181', 'cnpj must be stored on the business record';

  assert v_result->>'phone_status' = 'stored', 'result must report phone_status=stored';
  assert v_result->>'cnpj_status' = 'stored', 'result must report cnpj_status=stored';

  -- idempotent replay with the same key must not error and must return the same result
  perform public.provision_public_signup_participant_v3(
    v_user_account_id, 'Maria Teste', 'Negócio Teste', '{}'::jsonb,
    encode(sha256('lookup-1'::bytea), 'hex'), 'ciphertext-1234', 'iv-1234567890ab', 'tag-12345678901234',
    1, '+5511912345678', '11222333000181', 'test-contact-details-1'
  );

  raise notice 'participant contact details test passed';
end $$;

do $$
declare
  v_user_account_id uuid := gen_random_uuid();
  v_raised boolean := false;
begin
  insert into iam.user_accounts(id, email_normalized, status)
  values (v_user_account_id, 'contato-invalido@estimulo.org', 'active');

  begin
    perform public.provision_public_signup_participant_v3(
      v_user_account_id, 'Joao Teste', null, '{}'::jsonb,
      encode(sha256('lookup-2'::bytea), 'hex'), 'ciphertext-1234', 'iv-1234567890ab', 'tag-12345678901234',
      1, '123', null, 'test-contact-details-2'
    );
  exception when others then
    v_raised := true;
    assert sqlerrm = 'PHONE_INVALID', format('expected PHONE_INVALID, got %s', sqlerrm);
  end;
  assert v_raised, 'invalid phone must raise PHONE_INVALID';
  raise notice 'invalid phone rejection test passed';
end $$;

rollback;
```

Create `scripts/database/participant-contact-details/run.mjs`:

```js
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const file = path.join(root, "scripts/database/participant-contact-details/test-participant-contact-details.sql");
const result = spawnSync("psql", ["--dbname", databaseUrl, "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", file], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`participant contact details test failed with status ${result.status}`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL=<local-postgres-url> node scripts/database/participant-contact-details/run.mjs`
Expected: FAIL — `function public.provision_public_signup_participant_v3(...) does not exist`

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260723120000_participant_contact_details.sql`:

```sql
set lock_timeout = '5s';
set statement_timeout = '5min';

alter table core.entrepreneurs add column if not exists phone_e164 text;
alter table core.entrepreneurs add constraint ck_core_entrepreneurs_phone_e164
  check (phone_e164 is null or phone_e164 ~ '^\+55\d{10,11}$');

alter table core.businesses add column if not exists cnpj text;
alter table core.businesses add constraint ck_core_businesses_cnpj
  check (cnpj is null or cnpj ~ '^\d{14}$');
alter table core.businesses add constraint uq_core_businesses_cnpj unique (cnpj);

create or replace function public.provision_public_signup_participant_v3(
  p_user_account_id uuid,
  p_preferred_name text,
  p_business_name text,
  p_attribution jsonb,
  p_cpf_lookup_hmac text,
  p_cpf_ciphertext_base64 text,
  p_cpf_initialization_vector_base64 text,
  p_cpf_authentication_tag_base64 text,
  p_cpf_key_version integer,
  p_phone_e164 text,
  p_cnpj text,
  p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
  v_entrepreneur_id uuid;
  v_business_id uuid;
  v_cnpj_status text;
begin
  if coalesce(p_phone_e164,'') !~ '^\+55\d{10,11}$' then
    raise exception 'PHONE_INVALID' using errcode='22023';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^\d{14}$' then
    raise exception 'CNPJ_INVALID' using errcode='22023';
  end if;

  v_result:=public.provision_public_signup_participant_v2(
    p_user_account_id,p_preferred_name,p_business_name,p_attribution,
    p_cpf_lookup_hmac,p_cpf_ciphertext_base64,p_cpf_initialization_vector_base64,
    p_cpf_authentication_tag_base64,p_cpf_key_version,p_idempotency_key
  );

  v_entrepreneur_id:=(v_result->>'entrepreneur_id')::uuid;
  v_business_id:=nullif(v_result->>'business_id','')::uuid;

  update core.entrepreneurs set phone_e164=p_phone_e164 where id=v_entrepreneur_id;

  v_cnpj_status:='not_provided';
  if p_cnpj is not null then
    if v_business_id is null then
      raise exception 'CNPJ_REQUIRES_BUSINESS_NAME' using errcode='22023';
    end if;
    begin
      update core.businesses set cnpj=p_cnpj where id=v_business_id;
    exception when unique_violation then
      raise exception 'CNPJ_ALREADY_LINKED_TO_ANOTHER_BUSINESS' using errcode='23505';
    end;
    v_cnpj_status:='stored';
  end if;

  return v_result || jsonb_build_object('phone_status','stored','cnpj_status',v_cnpj_status);
end;
$$;

revoke all on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) from public,anon,authenticated;
grant execute on function public.provision_public_signup_participant_v3(
  uuid,text,text,jsonb,text,text,text,text,integer,text,text,text
) to postgres,service_role,app_worker;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `DATABASE_URL=<local-postgres-url> node scripts/database/participant-contact-details/run.mjs`
Expected: `NOTICE:  participant contact details test passed`, `NOTICE:  invalid phone rejection test passed`, exit status 0.

- [ ] **Step 5: Register the test gate**

Add to root `package.json` `scripts` (alphabetically near `test:practice-uploads`):

```json
"test:participant-contact-details": "node scripts/database/participant-contact-details/run.mjs",
```

And append `&& npm run test:participant-contact-details` to the `test:database-gates` chain (immediately after `npm run test:content-library`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260723120000_participant_contact_details.sql scripts/database/participant-contact-details package.json
git commit -m "feat(db): add phone/cnpj columns and provision_public_signup_participant_v3"
```

---

### Task 4: Wire telefone/CNPJ into `/cadastro/concluir`

**Files:**
- Modify: `apps/web/lib/auth/public-signup-provisioning.ts`
- Modify: `apps/web/app/cadastro/concluir/actions.ts`
- Modify: `apps/web/app/cadastro/concluir/page.tsx`
- Test: `scripts/application/auth-entrypoints.test.mjs` (extend the existing `"verified signup requires CPF..."` test)

**Interfaces:**
- Consumes: `normalizePhoneBr`/`isValidPhoneBr`/`toE164Br` from Task 1, `isValidCnpj`/`normalizeCnpj` from Task 2, `provision_public_signup_participant_v3` from Task 3.
- Produces: `provisionPublicSignupParticipant(input: { userAccountId: string; preferredName: string; businessName: string | null; attribution: FirstTouchAttribution; protectedCpf: ProtectedCpf; phoneE164: string; cnpj: string | null; idempotencyKey: string }): Promise<PublicSignupProvisioningResult>` (return type gains `phone_status`/`cnpj_status`, both `"stored" | "not_provided"`).

- [ ] **Step 1: Write the failing test**

Add this block inside the existing `test("verified signup requires CPF and sends only a protected payload to the RPC", ...)` in `scripts/application/auth-entrypoints.test.mjs` (append these assertions after the existing ones in that test body, using the already-loaded `completionPage`/`completionAction` variables):

```js
  assert.match(completionPage, /name="telefone"/u);
  assert.match(completionPage, /Telefone é obrigatório/u);
  assert.match(completionPage, /name="cnpj"/u);
  assert.match(completionAction, /toE164Br\(parsed\.data\.telefone/u);
  assert.match(completionAction, /isValidCnpj\(parsed\.data\.cnpj/u);
  assert.match(completionAction, /phoneE164/u);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/auth-entrypoints.test.mjs`
Expected: FAIL — the new `assert.match` calls fail because `completionPage`/`completionAction` don't contain `telefone`/`cnpj`/`toE164Br`/`isValidCnpj` yet.

- [ ] **Step 3: Implement — provisioning wrapper**

Modify `apps/web/lib/auth/public-signup-provisioning.ts` (full new content):

```ts
import "server-only";
import { invokeServerRpc } from "@/lib/rpc/server-invoke";
import type { FirstTouchAttribution } from "@/lib/auth/first-touch";
import type { ProtectedCpf } from "@/lib/identity/cpf";

export type PublicSignupProvisioningResult = {
  user_account_id: string;
  entrepreneur_id: string;
  business_id: string | null;
  attribution_id: string;
  email_normalized: string;
  cpf_status: "protected";
  phone_status: "stored";
  cnpj_status: "stored" | "not_provided";
};

export function provisionPublicSignupParticipant(input: {
  userAccountId: string;
  preferredName: string;
  businessName: string | null;
  attribution: FirstTouchAttribution;
  protectedCpf: ProtectedCpf;
  phoneE164: string;
  cnpj: string | null;
  idempotencyKey: string;
}) {
  return invokeServerRpc<PublicSignupProvisioningResult>("provision_public_signup_participant_v3", {
    p_user_account_id: input.userAccountId,
    p_preferred_name: input.preferredName,
    p_business_name: input.businessName,
    p_attribution: input.attribution,
    p_cpf_lookup_hmac: input.protectedCpf.lookupHmac,
    p_cpf_ciphertext_base64: input.protectedCpf.ciphertext,
    p_cpf_initialization_vector_base64: input.protectedCpf.initializationVector,
    p_cpf_authentication_tag_base64: input.protectedCpf.authenticationTag,
    p_cpf_key_version: input.protectedCpf.keyVersion,
    p_phone_e164: input.phoneE164,
    p_cnpj: input.cnpj,
    p_idempotency_key: input.idempotencyKey,
  });
}
```

- [ ] **Step 4: Implement — action**

Modify `apps/web/app/cadastro/concluir/actions.ts` (full new content):

```ts
"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { decodeFirstTouch, FIRST_TOUCH_COOKIE } from "@/lib/auth/first-touch";
import { provisionPublicSignupParticipant } from "@/lib/auth/public-signup-provisioning";
import { isValidCpf, protectCpf, type ProtectedCpf } from "@/lib/identity/cpf";
import { isValidCnpj, normalizeCnpj } from "@/lib/identity/cnpj-core.mjs";
import { isValidPhoneBr, toE164Br } from "@/lib/identity/phone-br.mjs";

const schema = z.object({
  preferredName: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).optional(),
  cpf: z.string().trim().refine(isValidCpf, "CPF_INVALID"),
  telefone: z.string().trim().refine(isValidPhoneBr, "TELEFONE_INVALID"),
  cnpj: z.string().trim().refine((value) => value === "" || isValidCnpj(value), "CNPJ_INVALID"),
});

export async function completePublicSignupAction(formData: FormData) {
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const parsed = schema.safeParse({
    preferredName: formData.get("preferred_name"),
    businessName: formData.get("business_name") || undefined,
    cpf: formData.get("cpf"),
    telefone: formData.get("telefone"),
    cnpj: formData.get("cnpj") || "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    const code = issue === "CPF_INVALID" ? "cpf_invalido"
      : issue === "TELEFONE_INVALID" ? "telefone_invalido"
      : issue === "CNPJ_INVALID" ? "cnpj_invalido"
      : "dados_invalidos";
    redirect(`/cadastro/concluir?erro=${code}`);
  }

  let protectedCpf: ProtectedCpf;
  try {
    protectedCpf = protectCpf(parsed.data.cpf, auth.identity.user_account_id);
  } catch (error) {
    if (error instanceof Error && error.message === "CPF_INVALID") {
      redirect("/cadastro/concluir?erro=cpf_invalido");
    }
    redirect("/cadastro/concluir?erro=protecao_cpf_indisponivel");
  }

  const phoneE164 = toE164Br(parsed.data.telefone);
  const cnpj = parsed.data.cnpj ? normalizeCnpj(parsed.data.cnpj) : null;

  const cookieStore = await cookies();
  const attribution = decodeFirstTouch(cookieStore.get(FIRST_TOUCH_COOKIE)?.value) ?? {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    landing_path: "/cadastro",
  };

  try {
    await provisionPublicSignupParticipant({
      userAccountId: auth.identity.user_account_id,
      preferredName: parsed.data.preferredName,
      businessName: parsed.data.businessName || null,
      attribution,
      protectedCpf,
      phoneE164,
      cnpj,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code.includes("CPF_ALREADY_LINKED_TO_ANOTHER_ACCOUNT")) {
      redirect("/cadastro/concluir?erro=cpf_ja_vinculado");
    }
    if (code.includes("CPF_CHANGE_REQUIRES_IDENTITY_REVIEW")) {
      redirect("/cadastro/concluir?erro=cpf_revisao_necessaria");
    }
    if (code.includes("CNPJ_ALREADY_LINKED_TO_ANOTHER_BUSINESS")) {
      redirect("/cadastro/concluir?erro=cnpj_ja_vinculado");
    }
    redirect("/cadastro/concluir?erro=provisionamento_falhou");
  }

  cookieStore.delete(FIRST_TOUCH_COOKIE);
  redirect("/empreendedor");
}
```

- [ ] **Step 5: Implement — page fields**

Modify `apps/web/app/cadastro/concluir/page.tsx`: add `cnpj_ja_vinculado` and `telefone_invalido`/`cnpj_invalido` to the `errorMessages` map, and add the two fields to the form. Full new content:

```tsx
import { redirect } from "next/navigation";
import { AuthLayout, FormMessage } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/context";
import { createSessionClient } from "@/lib/supabase/server";
import { completePublicSignupAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  dados_invalidos: "Revise os dados antes de continuar.",
  cpf_invalido: "Informe um CPF válido.",
  cpf_ja_vinculado: "Este CPF já está vinculado a outra conta. Procure o suporte para recuperar o acesso.",
  cpf_revisao_necessaria: "A alteração do CPF exige revisão de identidade pelo suporte.",
  telefone_invalido: "Informe um telefone válido, com DDD.",
  cnpj_invalido: "Informe um CNPJ válido ou deixe o campo em branco.",
  cnpj_ja_vinculado: "Este CNPJ já está vinculado a outro negócio cadastrado.",
  protecao_cpf_indisponivel: "A proteção do CPF não está configurada neste ambiente.",
  provisionamento_falhou: "Não foi possível concluir o perfil agora.",
};

export default async function CompleteSignupPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const auth = await getAuthContext();
  if (auth.status !== "authenticated") redirect("/entrar?erro=confirmacao_necessaria");
  if (auth.identity.entrepreneur_id) redirect("/empreendedor");

  const client = await createSessionClient();
  const { data } = await client.auth.getUser();
  const metadata = data.user?.user_metadata ?? {};
  const preferredName = typeof metadata.preferred_name === "string" ? metadata.preferred_name : "";
  const businessName = typeof metadata.business_name === "string" ? metadata.business_name : "";

  return (
    <AuthLayout
      eyebrow="E-mail confirmado"
      title="Concluir perfil"
      description="O CPF é obrigatório para identificar a mesma pessoa sem duplicidade. Ele é validado, cifrado no servidor e não é gravado em metadata, URL ou logs."
      wide
    >
      {erro ? <FormMessage tone="error">{errorMessages[erro] ?? "Revise os dados antes de continuar."}</FormMessage> : null}
      <form action={completePublicSignupAction} className="grid gap-4">
        <Label>
          Seu nome
          <Input name="preferred_name" defaultValue={preferredName} minLength={2} maxLength={120} autoComplete="name" required />
        </Label>
        <Label>
          CPF
          <Input
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            minLength={11}
            maxLength={14}
            pattern="[0-9.\-]{11,14}"
            required
            aria-describedby="cpf-protection"
          />
        </Label>
        <p id="cpf-protection" className="-mt-2 text-sm text-muted">
          O sistema mantém uma versão cifrada e um token HMAC de busca. O CPF bruto não é enviado ao HubSpot por padrão.
        </p>
        <Label>
          Telefone
          <Input
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            required
          />
        </Label>
        <Label>
          Nome do negócio <span className="font-normal text-muted">(opcional)</span>
          <Input name="business_name" defaultValue={businessName} maxLength={160} autoComplete="organization" />
        </Label>
        <Label>
          CNPJ <span className="font-normal text-muted">(opcional)</span>
          <Input name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" maxLength={18} />
        </Label>
        <Button size="lg" type="submit">
          Entrar na plataforma
        </Button>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test scripts/application/auth-entrypoints.test.mjs`
Expected: PASS (all tests in the file, including the new assertions)

Run: `npm run typecheck:web`
Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/auth/public-signup-provisioning.ts apps/web/app/cadastro/concluir/actions.ts apps/web/app/cadastro/concluir/page.tsx scripts/application/auth-entrypoints.test.mjs
git commit -m "feat(signup): collect telefone and CNPJ at /cadastro/concluir"
```

---

### Task 5: Identity-matching decision engine (pure, no I/O)

**Files:**
- Create: `apps/web/lib/identity/hubspot-match.ts`
- Test: `scripts/application/hubspot-match.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export type IdentitySignal = { cpfLookupHmac: string | null; emailNormalized: string | null; phoneE164: string | null };
  export type IdentityCandidate = { candidateId: string; signals: IdentitySignal };
  export type IdentityMatchState =
    | { state: "no_match_create" }
    | { state: "single_match"; candidateId: string; matchedOn: Array<"cpf" | "email" | "phone"> }
    | { state: "multiple_matches_manual_resolution"; candidateIds: string[] }
    | { state: "conflict_blocked"; candidateId: string; reason: "email_matches_but_cpf_differs" };
  export function resolveIdentityMatch(subject: IdentitySignal, candidates: IdentityCandidate[]): IdentityMatchState;
  ```

This function implements the rule from `docs/architecture/IDENTITY_BRIDGE.md`: matching never relies on email alone. A candidate only counts as a genuine match if **CPF or phone** agrees (email alone is never sufficient); if email matches a candidate but CPF disagrees, that is a conflict, not a match, and must never auto-link.

- [ ] **Step 1: Write the failing test**

Create `scripts/application/hubspot-match.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { resolveIdentityMatch } from "../../apps/web/lib/identity/hubspot-match.js";

const subject = { cpfLookupHmac: "hmac-a", emailNormalized: "maria@example.com", phoneE164: "+5511912345678" };

test("no candidates share any signal -> no_match_create", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-z", emailNormalized: "outro@example.com", phoneE164: null } },
  ]);
  assert.deepEqual(result, { state: "no_match_create" });
});

test("exactly one candidate shares CPF -> single_match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-a", emailNormalized: null, phoneE164: null } },
  ]);
  assert.equal(result.state, "single_match");
  assert.equal(result.candidateId, "c1");
  assert.deepEqual(result.matchedOn, ["cpf"]);
});

test("exactly one candidate shares phone only -> single_match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-z", emailNormalized: null, phoneE164: "+5511912345678" } },
  ]);
  assert.equal(result.state, "single_match");
  assert.deepEqual(result.matchedOn, ["phone"]);
});

test("email matches but CPF differs -> conflict_blocked, never an automatic match", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-different", emailNormalized: "maria@example.com", phoneE164: null } },
  ]);
  assert.deepEqual(result, { state: "conflict_blocked", candidateId: "c1", reason: "email_matches_but_cpf_differs" });
});

test("email alone matching, with no CPF or phone on either side, is not enough to auto-match", () => {
  const result = resolveIdentityMatch(
    { cpfLookupHmac: null, emailNormalized: "maria@example.com", phoneE164: null },
    [{ candidateId: "c1", signals: { cpfLookupHmac: null, emailNormalized: "maria@example.com", phoneE164: null } }],
  );
  assert.equal(result.state, "multiple_matches_manual_resolution");
  assert.deepEqual(result.candidateIds, ["c1"]);
});

test("two or more candidates match by CPF/phone -> multiple_matches_manual_resolution, never auto-linked", () => {
  const result = resolveIdentityMatch(subject, [
    { candidateId: "c1", signals: { cpfLookupHmac: "hmac-a", emailNormalized: null, phoneE164: null } },
    { candidateId: "c2", signals: { cpfLookupHmac: null, emailNormalized: null, phoneE164: "+5511912345678" } },
  ]);
  assert.equal(result.state, "multiple_matches_manual_resolution");
  assert.deepEqual(result.candidateIds.sort(), ["c1", "c2"]);
});

test("no candidates at all -> no_match_create", () => {
  assert.deepEqual(resolveIdentityMatch(subject, []), { state: "no_match_create" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/application/hubspot-match.test.mjs`
Expected: FAIL — module `apps/web/lib/identity/hubspot-match.js` (compiled output) not found / `apps/web/lib/identity/hubspot-match.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/identity/hubspot-match.ts`:

```ts
export type IdentitySignal = {
  cpfLookupHmac: string | null;
  emailNormalized: string | null;
  phoneE164: string | null;
};

export type IdentityCandidate = {
  candidateId: string;
  signals: IdentitySignal;
};

export type IdentityMatchState =
  | { state: "no_match_create" }
  | { state: "single_match"; candidateId: string; matchedOn: Array<"cpf" | "email" | "phone"> }
  | { state: "multiple_matches_manual_resolution"; candidateIds: string[] }
  | { state: "conflict_blocked"; candidateId: string; reason: "email_matches_but_cpf_differs" };

function matchedSignals(subject: IdentitySignal, candidate: IdentitySignal): Array<"cpf" | "email" | "phone"> {
  const matched: Array<"cpf" | "email" | "phone"> = [];
  if (subject.cpfLookupHmac && candidate.cpfLookupHmac && subject.cpfLookupHmac === candidate.cpfLookupHmac) {
    matched.push("cpf");
  }
  if (subject.phoneE164 && candidate.phoneE164 && subject.phoneE164 === candidate.phoneE164) {
    matched.push("phone");
  }
  if (subject.emailNormalized && candidate.emailNormalized && subject.emailNormalized === candidate.emailNormalized) {
    matched.push("email");
  }
  return matched;
}

function isStrongMatch(matched: Array<"cpf" | "email" | "phone">): boolean {
  return matched.includes("cpf") || matched.includes("phone");
}

export function resolveIdentityMatch(
  subject: IdentitySignal,
  candidates: IdentityCandidate[],
): IdentityMatchState {
  const withSignals = candidates.map((candidate) => ({
    candidate,
    matched: matchedSignals(subject, candidate.signals),
  }));

  const strongMatches = withSignals.filter(({ matched }) => isStrongMatch(matched));

  if (strongMatches.length === 1) {
    const [{ candidate, matched }] = strongMatches;
    return { state: "single_match", candidateId: candidate.candidateId, matchedOn: matched };
  }

  if (strongMatches.length > 1) {
    return {
      state: "multiple_matches_manual_resolution",
      candidateIds: strongMatches.map(({ candidate }) => candidate.candidateId),
    };
  }

  // No strong (CPF/phone) match. Check for an email-only conflict: email matches
  // but CPF disagrees on both sides -- this must never auto-link.
  const emailOnlyConflict = withSignals.find(
    ({ candidate, matched }) =>
      matched.includes("email")
      && subject.cpfLookupHmac
      && candidate.signals.cpfLookupHmac
      && subject.cpfLookupHmac !== candidate.signals.cpfLookupHmac,
  );
  if (emailOnlyConflict) {
    return {
      state: "conflict_blocked",
      candidateId: emailOnlyConflict.candidate.candidateId,
      reason: "email_matches_but_cpf_differs",
    };
  }

  // Email matches but neither side has CPF/phone to disambiguate -- ambiguous,
  // requires a human, never auto-created nor auto-linked.
  const emailOnlyMatches = withSignals.filter(({ matched }) => matched.includes("email"));
  if (emailOnlyMatches.length > 0) {
    return {
      state: "multiple_matches_manual_resolution",
      candidateIds: emailOnlyMatches.map(({ candidate }) => candidate.candidateId),
    };
  }

  return { state: "no_match_create" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit` (typecheck first)
Expected: no errors.

Run: `npm run typecheck:web`
Expected: no errors — the file is plain TypeScript checked by the existing project config.

Since the test file imports `.js` (the runtime extension used across this repo's `.mjs` tests for TS-compiled sources) but Task 5's module is authored as `.ts` with no build step wired into `node --test` directly, align the test import with how this repo already handles this (see `scripts/integrations/hubspot-contracts/run-tests.mjs`, which compiles TypeScript via `tsc` before running `node --test` against the compiled output): add `apps/web/lib/identity/hubspot-match.ts` under the same compiled-test pattern used by `scripts/integrations/hubspot-contracts` — copy that directory's `tsconfig.json` approach rather than inventing a new one. Concretely:

- Change the test import in `scripts/application/hubspot-match.test.mjs` to import directly from the TypeScript source using this repo's existing `scripts/application/*.test.mjs` convention instead (those files import `.ts` sources directly, e.g. `identity-policy.test.mjs` reads `.ts` files as **text** via `readFile`+regex, it does not execute them). Since `hubspot-match.ts` must be **executed** (we assert on return values, not on source text), it cannot use the text-regex style. Use the same compiled-execution approach as `scripts/integrations/hubspot-contracts/run-tests.mjs`:
  - Move the test to `scripts/integrations/hubspot-match/hubspot-match.test.mts` (adjacent `.test.mts` so `tsc` compiles it together with the source), and add a `run-tests.mjs` wrapper identical in structure to `scripts/integrations/hubspot-contracts/run-tests.mjs` but pointing at this new directory and a local `tsconfig.json` that includes `apps/web/lib/identity/hubspot-match.ts` and the new test file.

Re-run: `node scripts/integrations/hubspot-match/run-tests.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: Register the test gate**

Add to root `package.json` `scripts` (alphabetically near `test:hubspot-contracts`):

```json
"test:hubspot-match": "node scripts/integrations/hubspot-match/run-tests.mjs",
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/identity/hubspot-match.ts scripts/integrations/hubspot-match package.json
git commit -m "feat(identity): add pure HubSpot identity-match decision engine"
```

---

## Self-Review

**1. Spec coverage.** Covers "o login tem que pedir... nome, email, cpf, cnpj(opcional), telefone" (Tasks 1-4: telefone + CNPJ added; nome/email/CPF already existed and are untouched) and the identity-matching decision logic from the spec's Frente 1 (Task 5). Does **not** cover: live HubSpot search/create (explicitly deferred, see Deferred Scope), the "identidades a resolver" admin queue (deferred to Plan 1b — it needs Task 5's output type, which this plan now provides), and UTM capture (already implemented before this plan, untouched).

**2. Placeholder scan.** No TBD/TODO. Task 5 Step 4 contains a real architectural correction (test file location) discovered while writing the plan, not a vague "figure this out later" — the concrete replacement command is given.

**3. Type consistency.** `PublicSignupProvisioningResult` (Task 4) matches the RPC's actual return shape from Task 3's migration (`phone_status`, `cnpj_status`). `IdentityMatchState`/`IdentityCandidate`/`IdentitySignal` (Task 5) are self-contained and don't depend on any earlier task's types, since Task 5 has no dependency on Tasks 1-4 — verified no naming collisions (`resolveIdentityMatch` not referenced anywhere else in this plan).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-frente-1-login-identidade.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
