import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [diagnostic, signupCompletion, confirmationPage, confirmationSubmit, confirmationTemplate, commentPanel] = await Promise.all([
  readFile("apps/web/components/diagnostic-stepper.tsx", "utf8"),
  readFile("apps/web/app/cadastro/concluir/page.tsx", "utf8"),
  readFile("apps/web/app/auth/confirm/page.tsx", "utf8"),
  readFile("apps/web/components/email-confirmation-submit.tsx", "utf8"),
  readFile("supabase/templates/confirmation.html", "utf8"),
  readFile("apps/web/components/activity-comment-panel.tsx", "utf8"),
]);

test("diagnostic advances immediately after an answer while preserving back navigation", () => {
  assert.match(diagnostic, /function selectAnswer\(itemId: string, optionCode: string\)/u);
  assert.match(diagnostic, /onChange=\{\(\) => selectAnswer\(current\.id, option\.code\)\}/u);
  assert.match(diagnostic, /setCurrentIndex\(\(index\) => Math\.min\(items\.length - 1, index \+ 1\)\)/u);
  assert.match(diagnostic, />\s*Anterior\s*</u);
  assert.doesNotMatch(diagnostic, />\s*Continuar\s*</u);
});

test("signup explains what associating an optional CNPJ means", () => {
  assert.match(signupCompletion, /usaremos esse número para associar este negócio ao seu cadastro na Estímulo/u);
  assert.match(signupCompletion, /Você pode deixar o campo em branco/u);
});

test("email confirmation uses an app-owned token-hash flow and auto-submits on arrival", () => {
  assert.match(confirmationTemplate, /\.RedirectTo/u);
  assert.match(confirmationTemplate, /token_hash=\{\{ \.TokenHash \}\}&type=email/u);
  assert.doesNotMatch(confirmationTemplate, /\.ConfirmationURL/u);
  assert.match(confirmationPage, /EmailConfirmationSubmit/u);
  assert.match(confirmationSubmit, /requestSubmit\(\)/u);
  assert.match(confirmationSubmit, /Confirmando seu e-mail/u);
});

test("mobile lessons expose a persistent shortcut to the discussion", () => {
  assert.match(commentPanel, /href="#comentarios"/u);
  assert.match(commentPanel, /Comentar esta aula/u);
  assert.match(commentPanel, /md:hidden/u);
  assert.match(commentPanel, /fixed bottom-20 right-4/u);
});
