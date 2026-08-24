import fs from "node:fs";
import { chromium } from "playwright";

const base = (process.env.E2E_TARGET_URL || "").replace(/\/$/, "");
if (!base) throw new Error("E2E_TARGET_URL missing");

const sourceRunId = "32726630275";
const email = `pablomarchina+estimulo-e2e-${sourceRunId}@gmail.com`;
const password = `EsT!mulo-${sourceRunId}-Q7x9`;
const artifactDir = "artifacts/e2e-new-user-resume";
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

const cpf = cpfFromSeed(sourceRunId);
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
  sourceSignupRunId: sourceRunId,
  currentRunId: process.env.GITHUB_RUN_ID,
  email,
  cpf,
  expectedArchetype: "🌱 Fortalecendo a Base",
  startedAt: new Date().toISOString(),
  steps: [],
};

function record(name, data = {}) {
  report.steps.push({ name, at: new Date().toISOString(), ...data });
  fs.writeFileSync(`${artifactDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`NEW_USER_RESUME_STEP ${name} ${JSON.stringify(data)}`);
}

async function openDiagnosticFromHome(page) {
  if (new URL(page.url()).pathname !== "/empreendedor") {
    await page.goto(`${base}/empreendedor`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }
  const diagnosticButton = page.getByRole("button", { name: /Fazer diagnóstico|Continuar diagnóstico/ });
  await diagnosticButton.waitFor({ state: "visible", timeout: 60_000 });
  const destination = page.waitForURL(
    (url) => url.pathname.startsWith("/empreendedor/diagnostico") || url.pathname === "/empreendedor/jornadas",
    { timeout: 120_000 },
  );
  await diagnosticButton.click();
  await destination;
}

async function answerAndWaitForPersistence(page, answer, nextAnswer) {
  const radio = page.getByRole("radio", { name: answer, exact: true });
  await radio.waitFor({ state: "visible", timeout: 60_000 });

  const saveResponse = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return response.request().method() === "POST" && url.pathname === "/empreendedor/diagnostico";
    },
    { timeout: 120_000 },
  );

  await radio.check();
  const response = await saveResponse;
  if (!response.ok()) {
    throw new Error(`Per-answer diagnostic save failed with HTTP ${response.status()}`);
  }

  if (nextAnswer) {
    await page.getByRole("radio", { name: nextAnswer, exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(`${base}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);

  const loginDestination = page.waitForURL(
    (url) => url.pathname !== "/entrar" || url.searchParams.has("erro"),
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await loginDestination;
  await page.screenshot({ path: `${artifactDir}/01-login-destination.png`, fullPage: true });
  record("login_completed", { url: page.url() });

  if (page.url().includes("/entrar?erro=")) {
    throw new Error(`Login returned application error: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1200)}`);
  }

  if (!page.url().includes("/cadastro/concluir") && !page.url().match(/\/empreendedor(?:\?|$)/)) {
    await page.goto(`${base}/cadastro/concluir`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }

  if (page.url().includes("/cadastro/concluir")) {
    await page.locator('input[name="preferred_name"]').fill("Teste E2E Diagnóstico");
    await page.locator('input[name="cpf"]').fill(cpf);
    await page.locator('input[name="telefone"]').fill(phone);

    const profileDestination = page.waitForURL(
      (url) => url.pathname === "/empreendedor" || (url.pathname === "/cadastro/concluir" && url.searchParams.has("erro")),
      { timeout: 120_000 },
    );
    await page.getByRole("button", { name: "Entrar na plataforma" }).click();
    await profileDestination;

    await page.screenshot({ path: `${artifactDir}/02-profile-destination.png`, fullPage: true });
    if (page.url().includes("/cadastro/concluir?erro=")) {
      throw new Error(`Profile completion returned application error: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1200)}`);
    }
    record("profile_completed", { url: page.url() });
  } else {
    record("profile_already_completed", { url: page.url() });
  }

  await page.goto(`${base}/empreendedor`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.screenshot({ path: `${artifactDir}/03-participant-home.png`, fullPage: true });

  await openDiagnosticFromHome(page);

  if (new URL(page.url()).pathname === "/empreendedor/jornadas") {
    await page.screenshot({ path: `${artifactDir}/04-journey-required.png`, fullPage: true });
    record("journey_required", { url: page.url() });

    if (new URL(page.url()).searchParams.get("erro")) {
      throw new Error(`Journey catalog returned application error: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1600)}`);
    }

    const enrollmentForms = page.locator('form:has(input[name="journey_version_id"])');
    const enrollmentCount = await enrollmentForms.count();
    if (enrollmentCount === 0) {
      throw new Error(`No eligible journey enrollment action found :: ${(await page.locator("body").innerText()).slice(0, 2200)}`);
    }

    const enrollForm = enrollmentForms.first();
    const enrollButton = enrollForm.getByRole("button");
    await enrollButton.waitFor({ state: "visible", timeout: 60_000 });
    const enrollLabel = (await enrollButton.innerText()).trim();
    const journeyDestination = page.waitForURL(
      (url) => url.pathname.startsWith("/empreendedor/jornada/") || (url.pathname === "/empreendedor/jornadas" && url.searchParams.has("erro")),
      { timeout: 180_000 },
    );
    await enrollButton.click();
    await journeyDestination;
    await page.screenshot({ path: `${artifactDir}/05-journey-enrolled.png`, fullPage: true });

    if (new URL(page.url()).pathname === "/empreendedor/jornadas") {
      throw new Error(`Journey enrollment returned application error: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1800)}`);
    }

    record("journey_enrolled", { url: page.url(), actionLabel: enrollLabel });

    await page.goto(`${base}/empreendedor`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await openDiagnosticFromHome(page);
  }

  if (!new URL(page.url()).pathname.startsWith("/empreendedor/diagnostico")) {
    throw new Error(`Diagnostic did not open after journey enrollment: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1800)}`);
  }

  await page.screenshot({ path: `${artifactDir}/06-diagnostic-opened.png`, fullPage: true });
  record("diagnostic_opened", { url: page.url() });

  for (let i = 0; i < answers.length; i += 1) {
    await answerAndWaitForPersistence(page, answers[i], answers[i + 1]);
    record(`answer_${i + 1}_persisted`, { answer: answers[i] });
  }

  await page.screenshot({ path: `${artifactDir}/07-all-answers.png`, fullPage: true });
  const submit = page.getByRole("button", { name: "Enviar respostas e concluir diagnóstico" });
  await submit.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("Enviar respostas e concluir diagnóstico"));
    return button && !button.disabled;
  }, null, { timeout: 120_000 });

  await submit.click();
  await page.waitForURL((url) => {
    if (url.pathname === "/empreendedor/resultado" && url.searchParams.get("diagnostico") === "concluido") return true;
    if (url.pathname === "/empreendedor/diagnostico" && url.searchParams.has("erro")) return true;
    return false;
  }, { timeout: 180_000 });

  if (new URL(page.url()).pathname === "/empreendedor/diagnostico") {
    await page.screenshot({ path: `${artifactDir}/failure-submit.png`, fullPage: true });
    throw new Error(`Diagnostic submission returned application error: ${page.url()} :: ${(await page.locator("body").innerText()).slice(0, 1600)}`);
  }

  await page.getByText("Diagnóstico concluído", { exact: true }).waitFor({ state: "visible", timeout: 120_000 });
  await page.getByText("🌱 Fortalecendo a Base", { exact: true }).waitFor({ state: "visible", timeout: 120_000 });
  await page.screenshot({ path: `${artifactDir}/08-diagnostic-result.png`, fullPage: true });

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
