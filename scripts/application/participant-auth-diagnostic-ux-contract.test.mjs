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

test("diagnostic advances immediately after an answer while preserving back navigation and final CTA", () => {
  assert.match(diagnostic, /function selectAnswer\(itemId: string, optionCode: string\)/u);
  assert.match(diagnostic, /onChange=\{\(\) => selectAnswer\(current\.id, option\.code\)\}/u);
  assert.match(diagnostic, /setCurrentIndex\(\(index\) => Math\.min\(items\.length - 1, index \+ 1\)\)/u);
  assert.match(diagnostic, /const isLast = currentIndex === items\.length - 1/u);
  assert.match(diagnostic, />\s*Anterior\s*</u);
  assert.match(diagnostic, /Concluir diagnóstico/u);
  assert.match(diagnostic, /items\.some\(\(item\) => item\.is_required && !answers\[item\.id\]\)/u);
  assert.doesNotMatch(diagnostic, />\s*Continuar\s*</u);
});

test("signup explains optional CNPJ without a long disclaimer", () => {
  assert.match(signupCompletion, /Se o seu negócio tiver CNPJ, você pode informá-lo para vinculá-lo ao cadastro/u);
  assert.match(signupCompletion, /Se não tiver, deixe este campo em branco/u);
  assert.doesNotMatch(signupCompletion, /não quiser informar agora/u);
});

test("email confirmation uses an app-owned token-hash flow and auto-submits on arrival", () => {
  assert.match(confirmationTemplate, /\.RedirectTo/u);
  assert.match(confirmationTemplate, /token_hash=\{\{ \.TokenHash \}\}&type=email/u);
  assert.doesNotMatch(confirmationTemplate, /\.ConfirmationURL/u);
  assert.match(confirmationPage, /EmailConfirmationSubmit/u);
  assert.match(confirmationSubmit, /requestSubmit\(\)/u);
  assert.match(confirmationSubmit, /Confirmando seu e-mail/u);
});

test("mobile lesson discussion stays in the page without a broken floating shortcut", () => {
  assert.match(commentPanel, /name="body"/u);
  assert.match(commentPanel, /Publicar/u);
  assert.doesNotMatch(commentPanel, /Comentar esta aula/u);
  assert.doesNotMatch(commentPanel, /fixed bottom-20 right-4/u);
});
