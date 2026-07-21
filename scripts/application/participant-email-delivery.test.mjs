import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

test("participant signup and resend expose delivery failures instead of false success", async () => {
  const [signupAction, signupPage, confirmationAction, confirmationPage, signInAction] = await Promise.all([
    read("apps/web/app/cadastro/actions.ts"),
    read("apps/web/app/cadastro/page.tsx"),
    read("apps/web/app/auth/confirm/actions.ts"),
    read("apps/web/app/auth/confirm/page.tsx"),
    read("apps/web/app/entrar/actions.ts"),
  ]);

  assert.match(signupAction, /error\.status === 429/);
  assert.match(signupAction, /over_email_send_rate_limit/);
  assert.match(signupAction, /limite_email/);
  assert.match(signupPage, /limite temporário do servidor de e-mail/);

  assert.match(confirmationAction, /bad_code_verifier/);
  assert.match(confirmationAction, /\/entrar\?cadastro=confirmado/);
  assert.match(confirmationAction, /authErrorStatus\(error\) === 429/);
  assert.match(confirmationAction, /erro=limite_envio/);
  assert.match(confirmationAction, /erro=envio_falhou/);
  assert.match(confirmationPage, /Contas já confirmadas não recebem outro e-mail/);

  assert.match(signInAction, /error\?\.code === "email_not_confirmed"/);
  assert.match(signInAction, /erro=confirmacao_necessaria/);
});
