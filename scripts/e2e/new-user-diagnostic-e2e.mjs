import fs from "node:fs";
import { chromium } from "playwright";

const base = (process.env.E2E_TARGET_URL || "").replace(/\/$/, "");
if (!base) throw new Error("E2E_TARGET_URL missing");

const runId = process.env.GITHUB_RUN_ID;
const email = `pablomarchina+estimulo-e2e-${runId}@gmail.com`;
const password = `EsT!mulo-${runId}-Q7x9`;
const artifactDir = "artifacts/e2e-new-user";
fs.mkdirSync(artifactDir, { recursive: true });

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
const phone = "11900000000";
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
  runId,
  email,
  cpf,
  expectedArchetype: "🌱 Fortalecendo a Base",
  startedAt: new Date().toISOString(),
  steps: [],
};

function record(name, data = {}) {
  report.steps.push({ name, at: new Date().toISOString(), ...data });
  fs.writeFileSync(`${artifactDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`E2E_STEP ${name} ${JSON.stringify(data)}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(`${base}/cadastro`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[name="preferred_name"]').fill("Teste E2E Diagnóstico");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="password_confirmation"]').fill(password);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: `${artifactDir}/01-signup-result.png`, fullPage: true });
  record("signup_submitted", { url: page.url() });

  if (!page.url().includes("/cadastro/concluir")) {
    if (!page.url().includes("/entrar")) throw new Error(`Unexpected signup destination: ${page.url()}`);
    fs.writeFileSync(`${artifactDir}/awaiting-confirmation.txt`, `${email}\n`);
    console.log(`E2E_AWAITING_EMAIL_CONFIRMATION ${email}`);

    let confirmed = false;
    for (let attempt = 1; attempt <= 180; attempt += 1) {
      await page.goto(`${base}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      if (!page.url().includes("/entrar")) {
        confirmed = true;
        record("email_confirmed_and_login_succeeded", { attempt, url: page.url() });
        break;
      }
      if (attempt % 12 === 0) console.log(`E2E_WAITING_EMAIL attempt=${attempt}`);
      await page.waitForTimeout(5_000);
    }
    if (!confirmed) throw new Error("Email confirmation was not completed within the E2E window");
  } else {
    record("signup_created_session", { url: page.url() });
  }

  if (!page.url().includes("/cadastro/concluir")) {
    await page.goto(`${base}/cadastro/concluir`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }
  await page.locator('input[name="preferred_name"]').fill("Teste E2E Diagnóstico");
  await page.locator('input[name="cpf"]').fill(cpf);
  await page.locator('input[name="telefone"]').fill(phone);
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await page.waitForURL(/\/empreendedor(?:\?|$)/, { timeout: 60_000 });
  await page.screenshot({ path: `${artifactDir}/02-participant-home.png`, fullPage: true });
  record("profile_completed", { url: page.url() });

  const diagnosticButton = page.getByRole("button", { name: /Fazer diagnóstico|Continuar diagnóstico/ });
  await diagnosticButton.waitFor({ state: "visible", timeout: 60_000 });
  await diagnosticButton.click();
  await page.waitForURL(/\/empreendedor\/diagnostico/, { timeout: 60_000 });
  await page.screenshot({ path: `${artifactDir}/03-diagnostic-opened.png`, fullPage: true });
  record("diagnostic_opened", { url: page.url() });

  for (let i = 0; i < answers.length; i += 1) {
    const answer = answers[i];
    const radio = page.getByRole("radio", { name: answer, exact: true });
    await radio.waitFor({ state: "visible", timeout: 30_000 });
    await radio.check();
    record(`answer_${i + 1}`, { answer });
    if (i < answers.length - 1) {
      await page.getByText(`Pergunta ${i + 2} de ${answers.length}`).waitFor({ state: "visible", timeout: 30_000 });
    }
  }

  await page.screenshot({ path: `${artifactDir}/04-all-answers.png`, fullPage: true });
  const submit = page.getByRole("button", { name: "Enviar respostas e concluir diagnóstico" });
  await submit.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Enviar respostas e concluir diagnóstico"));
    return button && !button.disabled;
  }, null, { timeout: 60_000 });
  await submit.click();

  await page.waitForURL(/\/empreendedor\/resultado\?.*diagnostico=concluido/, { timeout: 90_000 });
  await page.getByText("Diagnóstico concluído", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByText("🌱 Fortalecendo a Base", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  await page.screenshot({ path: `${artifactDir}/05-diagnostic-result.png`, fullPage: true });

  const bodyText = await page.locator("body").innerText();
  report.finalUrl = page.url();
  report.resultVisible = bodyText.includes("Diagnóstico concluído") && bodyText.includes("🌱 Fortalecendo a Base");
  report.completedAt = new Date().toISOString();
  record("result_rendered", {
    finalUrl: report.finalUrl,
    resultVisible: report.resultVisible,
    expectedArchetype: report.expectedArchetype,
  });
  if (!report.resultVisible) throw new Error("Expected diagnostic result was not visible");
} catch (error) {
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  report.failedAt = new Date().toISOString();
  fs.writeFileSync(`${artifactDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await page.screenshot({ path: `${artifactDir}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
