import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [template, syncScript, signupAction, confirmationAction] = await Promise.all([
  readFile("supabase/templates/confirmation.html", "utf8"),
  readFile("scripts/operations/sync-supabase-confirmation-email.mjs", "utf8"),
  readFile("apps/web/app/cadastro/actions.ts", "utf8"),
  readFile("apps/web/app/confirm/actions.ts", "utf8"),
]);

test("confirmation email uses the server-side token-hash flow already configured by signup", () => {
  assert.match(template, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&type=email/u);
  assert.match(template, /Confirme seu e-mail/u);
  assert.match(template, /Confirmar meu e-mail/u);
  assert.match(signupAction, /new URL\("\/confirm", publicApplicationOrigin\(\)\)/u);
  assert.match(signupAction, /emailRedirectTo:\s*callback/u);
  assert.match(confirmationAction, /verifyOtp\(\{ token_hash: tokenHash, type: typeValue \}\)/u);
});

test("confirmation template sync validates inputs and verifies the hosted configuration after PATCH", () => {
  assert.match(syncScript, /SUPABASE_ACCESS_TOKEN_REQUIRED/u);
  assert.match(syncScript, /SUPABASE_PROJECT_REF_REQUIRED/u);
  assert.match(syncScript, /mailer_subjects_confirmation:\s*subject/u);
  assert.match(syncScript, /mailer_templates_confirmation_content:\s*template/u);
  assert.match(syncScript, /method:\s*"PATCH"/u);
  assert.match(syncScript, /method:\s*"GET"/u);
  assert.match(syncScript, /SUPABASE_AUTH_TEMPLATE_VERIFY_FAILED/u);
  assert.match(syncScript, /SUPABASE_AUTH_TEMPLATE_VERIFY_MISMATCH/u);
  assert.match(syncScript, /remoteConfig\.mailer_subjects_confirmation !== subject/u);
  assert.match(syncScript, /remoteConfig\.mailer_templates_confirmation_content !== template/u);
  assert.doesNotMatch(syncScript, /SUPABASE_ACCESS_TOKEN\s*=\s*["'][^"']+["']/u);
  assert.doesNotMatch(syncScript, /SUPABASE_PROJECT_REF\s*=\s*["'][a-z0-9]+["']/u);
});
