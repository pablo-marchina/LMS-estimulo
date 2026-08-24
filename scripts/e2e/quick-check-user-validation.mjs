import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = ["E2E_TARGET_URL", "E2E_PARTICIPANT_EMAIL", "E2E_PARTICIPANT_PASSWORD"];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const baseUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/quick-check-user-validation");
await mkdir(outputDir, { recursive: true });

const target = {
  journeyInstanceId: "66c10335-4af4-5369-a156-690ca9467477",
  journeyTitle: "ChatGPT para facilitar o seu dia a dia",
  stepInstanceId: "0b294d79-c9a6-579c-a34a-012f31f3c2fc",
  activityTitle: "Hora de conquistar seu primeiro selo",
};

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  target,
  login: null,
  journey: null,
  activity: null,
  retryPreparation: null,
  submitted: null,
  persistence: null,
  failures: [],
};

function routeOf(url) {
  const parsed = new URL(url, baseUrl);
  return `${parsed.pathname}${parsed.search}`;
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function screenshot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled", caret: "hide" });
  return path.relative(process.cwd(), file);
}

async function signIn(page) {
  const response = await page.goto(`${baseUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/empreendedor"), { timeout: 30_000 });
  await settle(page);
  report.login = { ok: true, landedOn: routeOf(page.url()) };
}

async function openJourneyFromVisibleCatalog(page) {
  await page.goto(`${baseUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const body = await page.locator("body").innerText();
  if (!body.includes(target.journeyTitle)) throw new Error(`target journey is not visible in participant catalog: ${target.journeyTitle}`);

  const form = page.locator(`form:has(input[name="journey_instance_id"][value="${target.journeyInstanceId}"])`).first();
  if (!(await form.count())) throw new Error("visible target journey has no participant open form");
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) throw new Error("target journey open CTA is unavailable");
  const buttonText = (await button.innerText()).trim();
  const before = await screenshot(page, "01-journey-catalog.png");

  await button.click();
  await page.waitForURL((url) => url.pathname === `/empreendedor/jornada/${target.journeyInstanceId}`, { timeout: 45_000 });
  await settle(page);
  if (!(await page.locator("body").innerText()).includes(target.journeyTitle)) throw new Error("journey page did not render the expected journey title");

  report.journey = {
    catalogRoute: "/empreendedor/jornadas",
    buttonText,
    route: routeOf(page.url()),
    screenshot: before,
  };
}

async function activityForm(page) {
  return page.locator(`form:has(input[name="step_instance_id"][value="${target.stepInstanceId}"])`).first();
}

async function openTargetActivityFromJourney(page, evidenceName) {
  const expectedJourneyPath = `/empreendedor/jornada/${target.journeyInstanceId}`;
  if (new URL(page.url()).pathname !== expectedJourneyPath) {
    await page.goto(`${baseUrl}${expectedJourneyPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
  }

  const body = await page.locator("body").innerText();
  if (!body.includes(target.activityTitle)) throw new Error(`target lesson is not visible in journey: ${target.activityTitle}`);

  const form = await activityForm(page);
  if (!(await form.count())) throw new Error("target lesson has no participant activity form");
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) throw new Error("target lesson CTA is unavailable");

  if (!(await button.isVisible())) {
    const details = form.locator("xpath=ancestor::details[1]");
    if (await details.count()) {
      const summary = details.locator("summary").first();
      if (await summary.count()) await summary.click();
      await page.waitForTimeout(300);
    }
  }
  if (!(await button.isVisible())) throw new Error("target lesson CTA exists but is not visible to the participant");

  const buttonText = (await button.innerText()).trim();
  const journeyShot = await screenshot(page, evidenceName);
  await button.click();
  await page.waitForURL((url) => url.pathname === `/empreendedor/atividade/${target.stepInstanceId}`, { timeout: 45_000 });
  await settle(page);

  const activityBody = await page.locator("body").innerText();
  if (!activityBody.includes(target.activityTitle)) throw new Error("activity page did not render the expected lesson title");

  return { buttonText, journeyShot, route: routeOf(page.url()) };
}

function expectedQuestionLocators(page) {
  const form = page.locator("form#verificacao");
  const q1 = form.locator("fieldset").filter({ hasText: "Qual é a proposta desta jornada?" }).first();
  const q2 = form.locator("fieldset").filter({ hasText: "Você precisa ter experiência com inteligência artificial para acompanhar esta jornada?" }).first();
  return { form, q1, q2 };
}

async function inputsAreEditable(page) {
  const { q1, q2 } = expectedQuestionLocators(page);
  const input1 = q1.locator('input[value="opcao_2"]');
  const input2 = q2.locator('input[value="opcao_3"]');
  if (!(await input1.count()) || !(await input2.count())) return false;
  return !(await input1.isDisabled()) && !(await input2.isDisabled());
}

async function preparePublishedRetryFlow(page) {
  const { form } = expectedQuestionLocators(page);
  if (!(await form.count())) throw new Error("quick-check form is not visible");
  if (await inputsAreEditable(page)) {
    report.retryPreparation = { needed: false, route: routeOf(page.url()) };
    return;
  }

  const body = await page.locator("body").innerText();
  const recordedCount = await form.getByText("Resposta registrada nesta tentativa.", { exact: true }).count().catch(() => 0);
  if (!/Revise e tente novamente/i.test(body) || recordedCount < 2) {
    throw new Error("quick-check inputs are unavailable and the published retry state was not recognized");
  }

  const submit = form.locator('button[type="submit"]');
  if (!(await submit.count()) || await submit.isDisabled()) throw new Error("published retry CTA is unavailable");

  const beforeRoute = routeOf(page.url());
  const beforeShot = await screenshot(page, "03-retry-state-before-opening-attempt.png");
  await submit.click();

  const deadline = Date.now() + 75_000;
  let lastRoute = routeOf(page.url());
  let lastBody = body;
  while (Date.now() < deadline) {
    await page.waitForTimeout(750);
    lastRoute = routeOf(page.url());
    lastBody = await page.locator("body").innerText().catch(() => lastBody);
    if (await inputsAreEditable(page)) {
      const afterShot = await screenshot(page, "04-third-attempt-opened.png");
      report.retryPreparation = {
        needed: true,
        beforeRoute,
        afterRoute: lastRoute,
        recordedCountBefore: recordedCount,
        responsePendingShown: /avaliacao=resposta_pendente/.test(lastRoute) || /Responda todas as perguntas/i.test(lastBody),
        beforeScreenshot: beforeShot,
        afterScreenshot: afterShot,
        ok: true,
      };
      return;
    }
    if (/avaliacao=erro/.test(lastRoute) || /Verificação preservada/i.test(lastBody)) {
      throw new Error(`published retry CTA failed while opening the final attempt (${lastRoute})`);
    }
    if (/limite de tentativas/i.test(lastBody)) throw new Error("quick-check attempt limit reached while opening final attempt");
  }

  throw new Error(`published retry CTA did not expose editable answers within timeout (${lastRoute})`);
}

async function selectCorrectAnswers(page) {
  await preparePublishedRetryFlow(page);

  const { form, q1, q2 } = expectedQuestionLocators(page);
  if (!(await form.count())) throw new Error("quick-check form is not visible");
  const submit = form.locator('button[type="submit"]');
  if (!(await submit.count()) || await submit.isDisabled()) {
    const body = await page.locator("body").innerText();
    throw new Error(/limite de tentativas/i.test(body) ? "quick-check attempt limit reached before final validation" : "quick-check submit is unavailable");
  }

  const metadata = (await form.locator("p").first().innerText().catch(() => "")).trim();
  if (!(await q1.count()) || !(await q2.count())) throw new Error("expected quick-check questions are not visible");

  const correct1 = q1.locator('input[value="opcao_2"]');
  const correct2 = q2.locator('input[value="opcao_3"]');
  if (!(await correct1.count()) || !(await correct2.count())) throw new Error("correct answer controls are not visible in the final attempt");
  await correct1.check();
  await correct2.check();

  const answers = [
    {
      prompt: "Qual é a proposta desta jornada?",
      value: "opcao_2",
      label: (await correct1.locator("xpath=ancestor::label").innerText()).trim(),
    },
    {
      prompt: "Você precisa ter experiência com inteligência artificial para acompanhar esta jornada?",
      value: "opcao_3",
      label: (await correct2.locator("xpath=ancestor::label").innerText()).trim(),
    },
  ];

  return { form, submit, metadata, answers };
}

async function waitForSubmissionOutcome(page) {
  const deadline = Date.now() + 75_000;
  let lastBody = "";
  let lastRoute = routeOf(page.url());
  while (Date.now() < deadline) {
    await page.waitForTimeout(750);
    lastRoute = routeOf(page.url());
    lastBody = await page.locator("body").innerText().catch(() => "");
    const decisive = /[?&](?:avaliacao=aprovada|avaliacao=reprovada|avaliacao=erro|avaliacao=resposta_pendente|conclusao=ok)(?:&|$)/.test(lastRoute)
      || /Aprendizado registrado|Aula concluída|Verificação preservada|Responda todas as perguntas/i.test(lastBody);
    if (decisive) return { route: lastRoute, body: lastBody, timedOut: false };
  }
  return { route: lastRoute, body: lastBody, timedOut: true };
}

async function submitAndRequirePass(page) {
  const { submit, metadata, answers } = await selectCorrectAnswers(page);
  const selectedShot = await screenshot(page, "05-correct-answers-selected.png");
  const beforeRoute = routeOf(page.url());

  await submit.click();
  const result = await waitForSubmissionOutcome(page);
  await settle(page);
  const afterRoute = routeOf(page.url());
  const afterBody = await page.locator("body").innerText().catch(() => result.body);
  const afterShot = await screenshot(page, "06-after-submit.png");

  const passed = /[?&](?:avaliacao=aprovada|conclusao=ok)(?:&|$)/.test(afterRoute) || /Aprendizado registrado|Aula concluída/i.test(afterBody);
  const failed = /[?&]avaliacao=reprovada(?:&|$)/.test(afterRoute) || /Revise e tente novamente/i.test(afterBody);
  const errored = /[?&]avaliacao=(?:erro|resposta_pendente)(?:&|$)/.test(afterRoute) || /Verificação preservada|Responda todas as perguntas/i.test(afterBody);

  report.submitted = {
    metadata,
    beforeRoute,
    afterRoute,
    answers,
    passed,
    failed,
    errored,
    timedOut: result.timedOut,
    selectedScreenshot: selectedShot,
    afterScreenshot: afterShot,
    resultText: passed ? "aprovada" : failed ? "reprovada" : errored ? "erro" : "indefinido",
  };

  if (!passed) throw new Error(`expected approved quick-check result, got ${report.submitted.resultText} at ${afterRoute}`);
}

async function verifyPersistenceThroughRealReopen(page) {
  const journeyPath = `/empreendedor/jornada/${target.journeyInstanceId}`;
  if (new URL(page.url()).pathname !== journeyPath) {
    const back = page.getByText("Voltar para a jornada", { exact: true }).first();
    if (await back.count() && await back.isVisible()) {
      await back.click();
      await page.waitForURL((url) => url.pathname === journeyPath, { timeout: 45_000 });
      await settle(page);
    } else {
      await page.goto(`${baseUrl}${journeyPath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await settle(page);
    }
  }

  const reopen = await openTargetActivityFromJourney(page, "07-journey-after-save.png");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const body = await page.locator("body").innerText();
  const registered = /Aprendizado registrado/i.test(body);
  const passedCardVisible = await page.locator('#verificacao:has-text("Aprendizado registrado")').isVisible().catch(() => false);
  const quickCheckFormStillPresent = (await page.locator("form#verificacao").count()) > 0;
  const reloadShot = await screenshot(page, "08-after-clean-reload.png");

  report.persistence = {
    reopenButtonText: reopen.buttonText,
    route: routeOf(page.url()),
    registered,
    passedCardVisible,
    quickCheckFormStillPresent,
    screenshot: reloadShot,
    ok: registered && passedCardVisible && !quickCheckFormStillPresent,
  };

  if (!report.persistence.ok) throw new Error("approved quick-check did not reappear as persisted after reopening the lesson and a clean reload");
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.failures.push(`pageerror: ${error.message}`));
  try {
    await signIn(page);
    await openJourneyFromVisibleCatalog(page);
    report.activity = await openTargetActivityFromJourney(page, "02-journey-target-lesson.png");
    await submitAndRequirePass(page);
    await verifyPersistenceThroughRealReopen(page);
  } catch (error) {
    report.failures.push(error instanceof Error ? error.message : String(error));
    await screenshot(page, "99-failure-state.png").catch(() => {});
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.ok = Boolean(report.submitted?.passed && report.persistence?.ok && report.failures.length === 0);
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
