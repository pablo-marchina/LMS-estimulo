import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [
  signupAction,
  signupPage,
  completionAction,
  confirmationAction,
  cpfProtection,
  readinessRoute,
  gateway,
  migration,
  productionValidator,
  productionContract,
] = await Promise.all([
  read("apps/web/app/cadastro/actions.ts"),
  read("apps/web/app/cadastro/page.tsx"),
  read("apps/web/app/cadastro/concluir/actions.ts"),
  read("apps/web/app/confirm/actions.ts"),
  read("apps/web/lib/identity/cpf.ts"),
  read("apps/web/app/api/health/ready/route.ts"),
  read("supabase/functions/authenticated-rpc/index.ts"),
  read("supabase/migrations/20260727153000_permanent_auth_signup_hardening.sql"),
  read("scripts/runtime/validate-production-config-core.mjs"),
  read("config/platform/aws-production.json"),
]);

test("initial signup never handles CPF or calls Auth Admin on an obfuscated user", () => {
  assert.match(signupAction, /isObfuscatedExistingUser/u);
  assert.match(signupAction, /identities/u);
  assert.match(signupAction, /conta_existente_ou_vinculada/u);
  assert.match(signupAction, /get_application_readiness/u);
  assert.doesNotMatch(signupAction, /protectCpf/u);
  assert.doesNotMatch(signupAction, /updateUserById/u);
  assert.doesNotMatch(signupAction, /deleteUser/u);
  assert.doesNotMatch(signupPage, /name="cpf"/u);
  assert.doesNotMatch(signupPage, /name="telefone"/u);
});

test("CPF is protected only inside authenticated profile completion", () => {
  assert.match(completionAction, /auth\.status !== "authenticated"/u);
  assert.match(completionAction, /assertCpfProtectionReady/u);
  assert.match(completionAction, /provisionPublicSignupParticipant/u);
  assert.match(completionAction, /PUBLIC_SIGNUP_CPF_PROTECTION_FAILED/u);
  assert.match(cpfProtection, /CPF_PROBE_VALUE/u);
  assert.match(cpfProtection, /unprotectCpfWithKeys/u);
  assert.match(readinessRoute, /assertCpfProtectionReady/u);
  assert.match(readinessRoute, /security_configuration_unavailable/u);
});

test("confirmed accounts recover from missing or consumed PKCE state", () => {
  assert.match(confirmationAction, /bad_code_verifier/u);
  assert.match(confirmationAction, /flow_state_not_found/u);
  assert.match(confirmationAction, /flow_state_expired/u);
  assert.match(confirmationAction, /exchange_code_not_found/u);
  assert.match(confirmationAction, /cadastro=confirmado/u);
});

test("public signup v3 remains available through the authenticated test gateway", () => {
  assert.match(gateway, /provision_public_signup_participant_v3/u);
  assert.match(gateway, /p_user_account_id/u);
  assert.match(gateway, /ACTOR_MISMATCH/u);
});

test("database recovery is narrow while AWS production remains fail-closed and undecided", () => {
  assert.match(migration, /@estimulo\\\.org/u);
  assert.match(migration, /custom_claims/u);
  assert.match(migration, /v_active_previous_count/u);
  assert.match(migration, /v_stale_identity_count <> 1/u);
  assert.match(migration, /public_signup_v3/u);
  assert.match(migration, /cpf_protection_schema/u);
  assert.match(migration, /identity_recovery/u);
  assert.match(productionValidator, /BUILD_SECRET_REUSE_FORBIDDEN:CPF_KEYS/u);
  assert.match(productionValidator, /AWS_BUILD_REQUIRES_DEPLOYED_ENVIRONMENT/u);
  assert.match(productionContract, /"architecture_status": "decision_pending"/u);
  assert.match(productionContract, /"production_ready": false/u);
});
