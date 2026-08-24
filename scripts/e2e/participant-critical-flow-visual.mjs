import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const targetUrl = (process.env.E2E_TARGET_URL || "").replace(/\/$/, "");
if (!targetUrl) throw new Error("Missing required environment variable: E2E_TARGET_URL");

const outputDir = path.resolve("artifacts/e2e-critical-flow");
await mkdir(outputDir, { recursive: true });

const runId = process.env.GITHUB_RUN_ID || String(Date.now());
const email = `pablomarchina+estimulo-e2e-${runId}@gmail.com`;
const password = `EsT!mulo-${runId}-Q7x9`;
const phone = "11900000000";

function cpfFromSeed(seed) {
  let digits = String(seed).replace(/\D/g, "").slice(-9).padStart(9, "7").split("").map(Number);
  if (new Set(digits).size === 1) digits[0] = (digits[0] + 1) % 10;
  const calc = (arr, start) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i += 1) sum += arr[i] * (start - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(digits, 10);
  const d2 = calc([...digits, d1], 11);
  return [...digits, d1, d2].join("");
}

const cpf = cpfFromSeed(runId);
const answers = [
  "Nunca",
  "Uso para despesas pessoais ou para pagar dívidas",
  "Ainda não faço nenhum controle financeiro",
  "Não teve jeito, acabei atrasando várias contas",
  "Compro e passo no cartão ou uso o cheque especial",
  "Ainda não",
  "O negócio praticamente pararia",
  "Vender, produzir ou entregar meu produto ou serviço",
  "Meu foco é aprender a organizar melhor o negócio",
];

const report = {
  schemaVersion: 99,
  startedAt: new Date().toISOString(),
  targetUrl,
  newUser: { email, cpf, steps: [] },
  captures: [],
  failures: [],
  summary: { captures: 0, failures: 0 },
};

async function persistReport() {
  await writeFile(path.join(outputDir, "critical-flow-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function record(name, data = {}) {
  report.newUser.steps.push({ name, at: new Date().toISOString(), ...data });
  console.log(`NEW_USER_E2E_STEP ${name} ${JSON.stringify(data)}`);
  await persistReport();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(`${targetUrl}/cadastro`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("Seu nome").fill("Teste E2E Diagnóstico");
  await page.getByLabel("E-mail").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password_confirmation"]').fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.screenshot({ path: path.join(outputDir, "01-signup-result.png"), fullPage: true });
  await record("signup_submitted", { url: page.url() });

  if (!page.url().includes("/cadastro/concluir")) {
    if (!page.url().includes("/entrar")) throw new Error(`Unexpected signup destination: ${page.url()}`);
    console.log(`NEW_USER_E2E_AWAITING_CONFIRMATION ${email}`);
    await writeFile(path.join(outputDir, "awaiting-confirmation.txt"), `${email}\n`, "utf8");

    let confirmed = false;
    for (let attempt = 1; attempt <= 120; attempt += 1) {
      await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByLabel("E-mail").fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      if (!page.url().includes("/entrar")) {
        confirmed = true;
        await record("email_confirmed_login_succeeded", { attempt, url: page.url() });
        break;
      }
      await page.waitForTimeout(5_000);
    }
    if (!confirmed) throw new Error("Email confirmation did not complete within E2E window");
  } else {
    await record("signup_created_session", { url: page.url() });
  }

  if (!page.url().includes("/cadastro/concluir")) {
    await page.goto(`${targetUrl}/cadastro/concluir`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }

  await page.getByLabel("Seu nome").fill("Teste E2E Diagnóstico");
  await page.getByLabel("CPF").fill(cpf);
  await page.getByLabel(/telefone/i).fill(phone);
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await page.waitForURL(/\/empreendedor(?:\?|$)/, { timeout: 90_000 });
  await page.screenshot({ path: path.join(outputDir, "02-participant-home.png"), fullPage: true });
  await record("profile_completed", { url: page.url() });

  const diagnosticButton = page.getByRole("button", { name: /Fazer diagnóstico|Continuar diagnóstico/ });
  await diagnosticButton.waitFor({ state: "visible", timeout: 60_000 });
  await diagnosticButton.click();
  await page.waitForURL(/\/empreendedor\/diagnostico/, { timeout: 90_000 });
  await record("diagnostic_opened", { url: page.url() });

  for (let index = 0; index < answers.length; index += 1) {
    const answer = answers[index];
    const radio = page.getByRole("radio", { name: answer, exact: true });
    await radio.waitFor({ state: "visible", timeout: 30_000 });
    await radio.check();
    await record(`answer_${index + 1}`, { answer });
    if (index < answers.length - 1) {
      await page.getByText(`Pergunta ${index + 2} de ${answers.length}`).waitFor({ state: "visible", timeout: 30_000 });
    }
  }

  const submit = page.getByRole("button", { name: "Enviar respostas e concluir diagnóstico" });
  await submit.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Enviar respostas e concluir diagnóstico"));
    return Boolean(button && !button.disabled);
  }, null, { timeout: 60_000 });
  await submit.click();

  await page.waitForURL(/\/empreendedor\/resultado\?.*diagnostico=concluido/, { timeout: 120_000 });
  await page.getByText("Diagnóstico concluído", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByText("🌱 Fortalecendo a Base", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await page.screenshot({ path: path.join(outputDir, "03-diagnostic-result.png"), fullPage: true });

  const body = await page.locator("body").innerText();
  report.newUser.finalUrl = page.url();
  report.newUser.expectedArchetype = "🌱 Fortalecendo a Base";
  report.newUser.resultVisible = body.includes("Diagnóstico concluído") && body.includes("🌱 Fortalecendo a Base");
  report.newUser.completedAt = new Date().toISOString();
  report.captures.push({
    viewport: { key: "production-new-user", width: 1440, height: 1000 },
    finalRoute: new URL(page.url()).pathname + new URL(page.url()).search,
    metrics: { canvasCenterDelta: null },
  });
  report.summary = { captures: 1, failures: 0 };
  await record("result_rendered", {
    finalUrl: report.newUser.finalUrl,
    resultVisible: report.newUser.resultVisible,
    expectedArchetype: report.newUser.expectedArchetype,
  });
  if (!report.newUser.resultVisible) throw new Error("Expected result was not visible in the real browser flow");
} catch (error) {
  report.failures.push({ message: error instanceof Error ? error.message : String(error) });
  report.summary.failures = report.failures.length;
  report.newUser.failedAt = new Date().toISOString();
  report.newUser.error = error instanceof Error ? error.stack || error.message : String(error);
  await page.screenshot({ path: path.join(outputDir, "failure.png"), fullPage: true }).catch(() => {});
  await persistReport();
  throw error;
} finally {
  await browser.close();
  await persistReport();
}
