import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = [
  "E2E_TARGET_URL",
  "E2E_PARTICIPANT_EMAIL",
  "E2E_PARTICIPANT_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const targetUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-functional");
await mkdir(outputDir, { recursive: true });

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  targetUrl,
  tests: [],
  failures: [],
};

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(450);
}

function assertNoGenericError(body, scope) {
  if (/Application error|Internal Server Error|Conteúdo não encontrado|Algo deu errado/i.test(body)) {
    throw new Error(`${scope}: generic or semantic error state rendered`);
  }
}

async function screenshot(page, name, fullPage = true) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage, animations: "disabled", caret: "hide" });
  return path.relative(process.cwd(), file);
}

async function signIn(page, role) {
  const email = role === "admin" ? process.env.E2E_ADMIN_EMAIL : process.env.E2E_PARTICIPANT_EMAIL;
  const password = role === "admin" ? process.env.E2E_ADMIN_PASSWORD : process.env.E2E_PARTICIPANT_PASSWORD;
  const prefix = role === "admin" ? "/admin" : "/empreendedor";

  const response = await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`${role}: login page unavailable (${response?.status() ?? "no response"})`);

  const loginBody = await page.locator("body").innerText();
  if (/vers[aã]o\s*1/i.test(loginBody)) throw new Error(`${role}: login still exposes Versão 1`);

  const passwordInput = page.locator('input[name="password"]');
  const reveal = page.locator('button[aria-label="Mostrar senha"], button[aria-label="Ocultar senha"]');
  if (!(await reveal.count())) throw new Error(`${role}: password reveal control missing`);
  if ((await passwordInput.getAttribute("type")) !== "password") throw new Error(`${role}: password input did not start masked`);
  await reveal.click();
  if ((await passwordInput.getAttribute("type")) !== "text") throw new Error(`${role}: password reveal control did not reveal the password input`);
  await reveal.click();
  if ((await passwordInput.getAttribute("type")) !== "password") throw new Error(`${role}: password reveal control did not mask the password input again`);

  await page.locator('input[name="email"]').fill(email);
  await passwordInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith(prefix), { timeout: 30_000 });
  await settle(page);

  const body = await page.locator("body").innerText().catch(() => "");
  assertNoGenericError(body, `${role} login`);
  return { finalUrl: page.url() };
}

async function testParticipantDiagnostic(page) {
  const response = await page.goto(`${targetUrl}/empreendedor/diagnostico`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  if (!response || response.status() >= 500) throw new Error(`diagnostic entry HTTP ${response?.status() ?? "no response"}`);

  const initialUrl = page.url();
  const initialBody = await page.locator("body").innerText().catch(() => "");
  assertNoGenericError(initialBody, "diagnostic entry");
  if (!new URL(initialUrl).pathname.startsWith("/empreendedor")) throw new Error(`diagnostic escaped participant area: ${initialUrl}`);

  const visibleAnswers = page.locator('input[type="radio"][name^="visible_answer_"]');
  const completedState = /Diagnóstico concluído|Seu perfil já foi identificado/i.test(initialBody);
  const evidence = { initialUrl, mode: completedState ? "completed" : "interactive", persistedAnswer: false, screenshot: null };

  if (await visibleAnswers.count()) {
    const first = visibleAnswers.first();
    const visibleName = await first.getAttribute("name");
    const optionCode = await first.getAttribute("value");
    if (!visibleName || !optionCode) throw new Error("diagnostic option is missing a stable name/value");
    const itemId = visibleName.replace(/^visible_answer_/, "");

    await first.check();
    await page.getByText("Salvando resposta…", { exact: true }).waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(500);

    const localHidden = page.locator(`input[name="answer_${itemId}"]`);
    if (!(await localHidden.count()) || (await localHidden.inputValue()) !== optionCode) {
      throw new Error("diagnostic selection was not reflected in the form state");
    }

    await page.evaluate(() => {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("estimulo:diagnostic:")) window.localStorage.removeItem(key);
      }
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const reloadedBody = await page.locator("body").innerText().catch(() => "");
    assertNoGenericError(reloadedBody, "diagnostic reload after answer");

    const persisted = page.locator(`input[name="answer_${itemId}"]`);
    if (!(await persisted.count()) || (await persisted.inputValue()) !== optionCode) {
      throw new Error("diagnostic answer did not persist server-side after clearing local draft state");
    }
    evidence.persistedAnswer = true;
  } else if (!completedState) {
    throw new Error("diagnostic opened but exposed neither an interactive question nor a completed state");
  }

  evidence.screenshot = await screenshot(page, "participant-diagnostic-functional");
  return evidence;
}

async function openAnEnrolledJourney(page) {
  await page.goto(`${targetUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const enrolledLinks = page.locator('a[href^="/empreendedor/jornada/"]');
  if (await enrolledLinks.count()) {
    await enrolledLinks.first().click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  const instanceForms = page.locator('form:has(input[name="journey_instance_id"])');
  if (await instanceForms.count()) {
    const button = instanceForms.first().locator('button[type="submit"]');
    if (!(await button.count()) || await button.isDisabled()) throw new Error("enrolled journey CTA is unavailable");
    await button.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  const eligibleForms = page.locator('form:has(input[name="journey_version_id"])');
  if (await eligibleForms.count()) {
    const button = eligibleForms.first().locator('button[type="submit"]');
    if (!(await button.count()) || await button.isDisabled()) throw new Error("eligible journey CTA is unavailable");
    await button.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  throw new Error("no enrolled or eligible journey is available for the participant functional test");
}

async function collectActivityCandidates(page) {
  await page.locator("details").evaluateAll((nodes) => nodes.forEach((node) => { node.open = true; })).catch(() => {});
  return page.locator('form:has(input[name="step_instance_id"]):has(input[name="step_status"])').evaluateAll((forms) => forms.map((form) => {
    const step = form.querySelector('input[name="step_instance_id"]')?.value ?? "";
    const status = form.querySelector('input[name="step_status"]')?.value ?? "";
    const button = form.querySelector('button[type="submit"]');
    return { step, status, disabled: Boolean(button?.disabled) };
  }).filter((item) => item.step && !item.disabled));
}

async function openActivityByStep(page, journeyRoute, step) {
  await page.goto(`${targetUrl}${journeyRoute}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  await page.locator("details").evaluateAll((nodes) => nodes.forEach((node) => { node.open = true; })).catch(() => {});
  const form = page.locator(`form:has(input[name="step_instance_id"][value="${step}"])`).first();
  if (!(await form.count())) return false;
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) return false;
  await button.click({ force: true });
  await page.waitForURL((url) => /^\/empreendedor\/atividade\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
  await settle(page);
  return true;
}

async function fillQuickCheck(form) {
  const textareas = form.locator('textarea[name^="answer_"]:not(:disabled)');
  for (let index = 0; index < await textareas.count(); index += 1) {
    await textareas.nth(index).fill(`Teste funcional E2E ${Date.now()} ${index + 1}`);
  }

  const radios = form.locator('input[type="radio"][name^="answer_"]:not(:disabled)');
  const radioNames = [...new Set(await radios.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("name")).filter(Boolean)))];
  for (const name of radioNames) {
    await form.locator(`input[type="radio"][name="${name}"]:not(:disabled)`).first().check();
  }

  const checks = form.locator('input[type="checkbox"][name^="answer_"]:not(:disabled)');
  const checkNames = [...new Set(await checks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("name")).filter(Boolean)))];
  for (const name of checkNames) {
    await form.locator(`input[type="checkbox"][name="${name}"]:not(:disabled)`).first().check();
  }
}

async function testParticipantQuickCheck(page) {
  await openAnEnrolledJourney(page);
  const journeyUrl = new URL(page.url());
  const journeyRoute = `${journeyUrl.pathname}${journeyUrl.search}`;
  const candidates = await collectActivityCandidates(page);
  if (!candidates.length) throw new Error("journey exposes no accessible activities for a real quick-check submission");

  let tested = null;
  for (const candidate of candidates) {
    if (!(await openActivityByStep(page, journeyRoute, candidate.step))) continue;
    const body = await page.locator("body").innerText().catch(() => "");
    assertNoGenericError(body, `activity ${candidate.step}`);

    if ([...await page.locator("button, a").allInnerTexts()].some((text) => text.trim() === "Abrir na fonte")) {
      throw new Error(`activity ${candidate.step} still exposes Abrir na fonte`);
    }

    const form = page.locator("form#verificacao");
    if (!(await form.count())) continue;
    const submit = form.getByRole("button", { name: "Enviar verificação" });
    if (!(await submit.count()) || await submit.isDisabled()) continue;

    await fillQuickCheck(form);
    const stepBefore = new URL(page.url()).pathname;
    await submit.click();
    await page.waitForURL((url) => url.pathname !== stepBefore || url.searchParams.has("avaliacao") || url.searchParams.has("conclusao"), { timeout: 30_000 }).catch(() => {});
    await settle(page);

    const finalUrl = new URL(page.url());
    const finalBody = await page.locator("body").innerText().catch(() => "");
    assertNoGenericError(finalBody, "quick-check submission result");
    if (finalUrl.searchParams.get("avaliacao") === "erro") {
      throw new Error("quick-check submission ended in the recoverable error state instead of completing the submission");
    }
    if (!finalUrl.pathname.startsWith("/empreendedor/")) throw new Error(`quick-check submission escaped participant area: ${finalUrl.pathname}`);

    const functionalOutcome = finalUrl.searchParams.get("avaliacao") || finalUrl.searchParams.get("conclusao") ||
      (/Aprendizado registrado/i.test(finalBody) ? "passed" : /Revise e tente novamente/i.test(finalBody) ? "failed_attempt" : "navigated");
    if (!functionalOutcome) throw new Error("quick-check submission did not expose a verifiable outcome");

    tested = {
      stepInstanceId: candidate.step,
      previousStatus: candidate.status,
      finalUrl: page.url(),
      outcome: functionalOutcome,
      screenshot: await screenshot(page, "participant-quick-check-functional"),
    };
    break;
  }

  if (!tested) throw new Error("no accessible activity exposed an enabled quick-check form for a real submission");
  return tested;
}

async function testAdminPointRuleLifecycle(page) {
  await page.goto(`${targetUrl}/admin/gamificacao?tipo=pontos`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  let body = await page.locator("body").innerText().catch(() => "");
  assertNoGenericError(body, "admin point-rule page");

  const token = `${process.env.GITHUB_RUN_ID || "local"}-${Date.now().toString(36)}`;
  const name = `E2E regra temporária ${token}`;
  const initialDescription = `Descrição funcional inicial ${token}`;
  const updatedDescription = `Descrição funcional atualizada ${token}`;
  const editor = page.locator('form:has(input[name="resource_type"][value="point_rule"])').first();
  if (!(await editor.count())) throw new Error("point-rule editor form is missing");

  await editor.locator('input[name="name"]').fill(name);
  await editor.locator('textarea[name="description"]').fill(initialDescription);
  await editor.locator('select[name="trigger_event"]').selectOption("journey.instance.started");
  await editor.locator('input[name="amount"]').fill("1");
  await editor.locator('select[name="frequency"]').selectOption("once");
  await editor.locator('select[name="status"]').selectOption("draft");
  await editor.getByRole("button", { name: "Salvar regra" }).click();
  await page.waitForURL((url) => url.pathname === "/admin/gamificacao" && url.searchParams.get("sucesso") === "salvo", { timeout: 30_000 });
  await settle(page);

  let selector = page.locator('select[name="definition_id"]').first();
  const createdOption = selector.locator("option", { hasText: name });
  if (!(await createdOption.count())) throw new Error("new point rule was not returned by the admin workspace after saving");
  const definitionId = await createdOption.first().getAttribute("value");
  if (!definitionId) throw new Error("new point rule is missing its definition id");

  await selector.selectOption(definitionId);
  await page.waitForTimeout(200);
  let description = page.locator('textarea[name="description"]').first();
  if ((await description.inputValue()) !== initialDescription) throw new Error("point-rule description did not persist after creation");

  await description.fill(updatedDescription);
  await page.locator('form:has(input[name="resource_type"][value="point_rule"])').first().getByRole("button", { name: "Salvar regra" }).click();
  await page.waitForURL((url) => url.pathname === "/admin/gamificacao" && url.searchParams.get("sucesso") === "salvo", { timeout: 30_000 });
  await settle(page);

  selector = page.locator('select[name="definition_id"]').first();
  await selector.selectOption(definitionId);
  await page.waitForTimeout(200);
  description = page.locator('textarea[name="description"]').first();
  if ((await description.inputValue()) !== updatedDescription) throw new Error("edited point-rule description did not persist after reload");

  const preRetireShot = await screenshot(page, "admin-point-rule-before-retire");
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remover pontuação desta ação" }).click();
  await page.waitForURL((url) => url.pathname === "/admin/gamificacao" && url.searchParams.get("sucesso") === "regra_removida", { timeout: 30_000 });
  await settle(page);

  body = await page.locator("body").innerText().catch(() => "");
  assertNoGenericError(body, "point-rule retirement result");
  if (!/Configuração salva/i.test(body)) throw new Error("retirement did not return the admin success state");
  const remainingOptions = await page.locator('select[name="definition_id"] option').allInnerTexts();
  if (remainingOptions.some((value) => value.trim() === name)) throw new Error("retired point rule is still selectable as an active rule");
  const postRetireShot = await screenshot(page, "admin-point-rule-after-retire");

  return {
    definitionId,
    name,
    initialDescriptionPersisted: true,
    updatedDescriptionPersisted: true,
    retiredThroughUi: true,
    removedFromActiveSelector: true,
    screenshots: [preRetireShot, postRetireShot],
  };
}

async function runTest(name, fn) {
  const startedAt = new Date().toISOString();
  try {
    const evidence = await fn();
    report.tests.push({ name, status: "passed", startedAt, finishedAt: new Date().toISOString(), evidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.tests.push({ name, status: "failed", startedAt, finishedAt: new Date().toISOString(), error: message });
    report.failures.push(`${name}: ${message}`);
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const participantContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const participantPage = await participantContext.newPage();
  await runTest("participant login controls and authentication", async () => {
    const evidence = await signIn(participantPage, "participant");
    evidence.screenshot = await screenshot(participantPage, "participant-authenticated-home", false);
    return evidence;
  });
  if (!report.failures.some((failure) => failure.startsWith("participant login controls"))) {
    await runTest("participant diagnostic access and server-side answer persistence", () => testParticipantDiagnostic(participantPage));
    await runTest("participant real quick-check submission", () => testParticipantQuickCheck(participantPage));
  }
  await participantContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const adminPage = await adminContext.newPage();
  await runTest("admin login controls and authentication", async () => {
    const evidence = await signIn(adminPage, "admin");
    evidence.screenshot = await screenshot(adminPage, "admin-authenticated-home", false);
    return evidence;
  });
  if (!report.failures.some((failure) => failure.startsWith("admin login controls"))) {
    await runTest("admin point-rule create edit and retire lifecycle through UI", () => testAdminPointRuleLifecycle(adminPage));
  }
  await adminContext.close();
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.summary = {
  tests: report.tests.length,
  passed: report.tests.filter((test) => test.status === "passed").length,
  failed: report.tests.filter((test) => test.status === "failed").length,
};
await writeFile(path.join(outputDir, "functional-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
for (const failure of report.failures) console.error(failure);
if (report.failures.length) process.exitCode = 1;
