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

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  login: null,
  journey: null,
  activitiesVisited: [],
  submitted: null,
  persistence: null,
  failures: [],
};

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function signIn(page) {
  const response = await page.goto(`${baseUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/empreendedor"), { timeout: 30_000 });
  await settle(page);
  report.login = { ok: true, landedOn: `${new URL(page.url()).pathname}${new URL(page.url()).search}` };
}

async function openEnrolledJourney(page) {
  await page.goto(`${baseUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const enrolledForms = page.locator('form:has(input[name="journey_instance_id"])');
  if (await enrolledForms.count()) {
    const button = enrolledForms.first().locator('button[type="submit"]');
    if (await button.count() && !(await button.isDisabled())) {
      await button.click();
      await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
      await settle(page);
      report.journey = { route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`, source: "enrolled-form" };
      return;
    }
  }

  const link = page.locator('a[href^="/empreendedor/jornada/"]').first();
  if (await link.count()) {
    await link.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    report.journey = { route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`, source: "journey-link" };
    return;
  }

  const eligibleForms = page.locator('form:has(input[name="journey_version_id"])');
  if (await eligibleForms.count()) {
    const button = eligibleForms.first().locator('button[type="submit"]');
    if (!(await button.count()) || await button.isDisabled()) throw new Error("eligible journey CTA is unavailable");
    await button.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    report.journey = { route: `${new URL(page.url()).pathname}${new URL(page.url()).search}`, source: "eligible-form" };
    return;
  }

  throw new Error("no enrolled or eligible journey CTA found");
}

async function collectActivityCandidates(page) {
  const journeyUrl = page.url();
  const forms = page.locator('form:has(input[name="step_instance_id"]):has(input[name="step_status"])');
  const count = await forms.count();
  const candidates = [];
  for (let index = 0; index < count; index += 1) {
    const form = forms.nth(index);
    const stepId = await form.locator('input[name="step_instance_id"]').inputValue().catch(() => "");
    const status = await form.locator('input[name="step_status"]').inputValue().catch(() => "");
    const button = form.locator('button[type="submit"]');
    const buttonText = await button.innerText().catch(() => "");
    const disabled = !(await button.count()) || await button.isDisabled().catch(() => true);
    candidates.push({ index, stepId, status, buttonText, disabled });
  }
  return { journeyUrl, candidates };
}

async function inspectQuickCheck(page) {
  const route = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
  const body = await page.locator("body").innerText().catch(() => "");
  const passedCard = page.locator('#verificacao:has-text("Aprendizado registrado")');
  const form = page.locator("form#verificacao");
  const hasForm = (await form.count()) > 0;
  let submitEnabled = false;
  let submitText = null;
  let questionCount = 0;
  let recordedCount = 0;
  let metadata = null;
  if (hasForm) {
    const submit = form.locator('button[type="submit"]');
    submitEnabled = (await submit.count()) > 0 && !(await submit.isDisabled());
    submitText = await submit.innerText().catch(() => null);
    questionCount = await form.locator("fieldset").count();
    recordedCount = await form.getByText("Resposta registrada nesta tentativa.", { exact: true }).count().catch(() => 0);
    metadata = await form.locator("p").first().innerText().catch(() => null);
  }
  return {
    route,
    hasForm,
    alreadyPassed: (await passedCard.count()) > 0,
    submitEnabled,
    submitText,
    questionCount,
    recordedCount,
    metadata,
    locked: /Conclua os conteúdos obrigatórios acima para enviar/i.test(body),
    attemptLimitReached: /O limite de tentativas desta versão foi atingido/i.test(body),
  };
}

async function answerVisibleQuestions(page) {
  const form = page.locator("form#verificacao");
  const fields = form.locator("fieldset");
  const count = await fields.count();
  const answers = [];

  for (let index = 0; index < count; index += 1) {
    const fieldset = fields.nth(index);
    if (await fieldset.isDisabled().catch(() => false)) continue;
    const prompt = await fieldset.locator("legend").innerText().catch(() => `Pergunta ${index + 1}`);
    const textarea = fieldset.locator("textarea");
    if (await textarea.count()) {
      const value = "Entendi o ponto principal da aula e consigo aplicá-lo em uma decisão prática do meu negócio.";
      await textarea.fill(value);
      answers.push({ prompt, type: "open_text", value });
      continue;
    }

    const inputs = fieldset.locator('input[type="radio"], input[type="checkbox"]');
    const inputCount = await inputs.count();
    if (!inputCount) throw new Error(`question has no answer control: ${prompt}`);
    const first = inputs.first();
    const type = await first.getAttribute("type");
    await first.check();
    const value = await first.getAttribute("value");
    const label = await first.locator("xpath=ancestor::label").innerText().catch(() => value ?? "first option");
    answers.push({ prompt, type, value, label });
  }

  return answers;
}

async function findAndSubmitQuickCheck(page) {
  const { journeyUrl, candidates } = await collectActivityCandidates(page);
  if (!candidates.length) throw new Error("journey page exposed no activity forms");

  for (const candidate of candidates) {
    await page.goto(journeyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const forms = page.locator('form:has(input[name="step_instance_id"]):has(input[name="step_status"])');
    if (candidate.index >= await forms.count()) continue;
    const form = forms.nth(candidate.index);
    const button = form.locator('button[type="submit"]');
    if (!(await button.count()) || await button.isDisabled()) {
      report.activitiesVisited.push({ ...candidate, skipped: "activity CTA disabled" });
      continue;
    }

    await button.click();
    await page.waitForURL((url) => /^\/empreendedor\/atividade\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    const activityUrl = page.url();
    const quickCheck = await inspectQuickCheck(page);
    report.activitiesVisited.push({ ...candidate, activityUrl, quickCheck });

    if (!quickCheck.hasForm || !quickCheck.submitEnabled) continue;

    const beforeScreenshot = path.join(outputDir, "before-submit.png");
    await page.screenshot({ path: beforeScreenshot, fullPage: true, animations: "disabled", caret: "hide" });
    const answers = await answerVisibleQuestions(page);
    const submit = page.locator('form#verificacao button[type="submit"]');
    if (await submit.isDisabled()) throw new Error("quick-check submit became disabled after answering");

    const beforeRoute = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
    await submit.click();
    await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1800);
    const afterUrl = page.url();
    const afterRoute = `${new URL(afterUrl).pathname}${new URL(afterUrl).search}`;
    const afterBody = await page.locator("body").innerText().catch(() => "");
    const afterScreenshot = path.join(outputDir, "after-submit.png");
    await page.screenshot({ path: afterScreenshot, fullPage: true, animations: "disabled", caret: "hide" }).catch(() => {});

    let outcome = "unknown";
    if (/Aprendizado registrado|Aula concluída/i.test(afterBody) || /[?&](?:avaliacao=aprovada|conclusao=ok)(?:&|$)/.test(afterRoute)) outcome = "passed";
    else if (/Revise e tente novamente/i.test(afterBody) || /[?&]avaliacao=reprovada(?:&|$)/.test(afterRoute)) outcome = "failed";
    else if (/Verificação preservada|avaliacao=erro/i.test(`${afterBody} ${afterRoute}`)) outcome = "error";
    else if (/Responda todas as perguntas|avaliacao=resposta_pendente/i.test(`${afterBody} ${afterRoute}`)) outcome = "pending";

    report.submitted = {
      activityUrl,
      beforeRoute,
      afterRoute,
      answers,
      outcome,
      beforeScreenshot: path.relative(process.cwd(), beforeScreenshot),
      afterScreenshot: path.relative(process.cwd(), afterScreenshot),
    };

    if (outcome === "error" || outcome === "pending" || outcome === "unknown") {
      throw new Error(`quick-check submission did not reach a valid result state: ${outcome} (${afterRoute})`);
    }

    const canonical = new URL(activityUrl);
    canonical.searchParams.delete("avaliacao");
    canonical.hash = "";
    await page.goto(canonical.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const persistedBody = await page.locator("body").innerText().catch(() => "");
    const persistedRoute = `${new URL(page.url()).pathname}${new URL(page.url()).search}`;
    const persistenceScreenshot = path.join(outputDir, "after-reload.png");
    await page.screenshot({ path: persistenceScreenshot, fullPage: true, animations: "disabled", caret: "hide" }).catch(() => {});

    const passedPersisted = /Aprendizado registrado/i.test(persistedBody);
    const failedPersisted = /Revise e tente novamente/i.test(persistedBody);
    const attemptMetadataMatch = persistedBody.match(/tentativa\s+\d+\s+de\s+\d+/i)?.[0] ?? null;
    const persistenceOk = outcome === "passed" ? passedPersisted : failedPersisted;

    report.persistence = {
      route: persistedRoute,
      outcome,
      passedPersisted,
      failedPersisted,
      attemptMetadata: attemptMetadataMatch,
      ok: persistenceOk,
      screenshot: path.relative(process.cwd(), persistenceScreenshot),
    };

    if (!persistenceOk) throw new Error(`submitted result did not persist after clean reload (outcome=${outcome})`);
    return;
  }

  throw new Error("no activity exposed an enabled, unanswered quick-check form for this participant");
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.failures.push(`pageerror: ${error.message}`));
  try {
    await signIn(page);
    await openEnrolledJourney(page);
    await findAndSubmitQuickCheck(page);
  } catch (error) {
    report.failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.ok = Boolean(report.submitted && report.persistence?.ok && report.failures.length === 0);
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: report.ok, submitted: report.submitted, persistence: report.persistence, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;
