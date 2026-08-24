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
  discovery: [],
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

function relativeRoute(url) {
  const parsed = new URL(url, baseUrl);
  return `${parsed.pathname}${parsed.search}`;
}

async function signIn(page) {
  const response = await page.goto(`${baseUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/empreendedor"), { timeout: 30_000 });
  await settle(page);
  report.login = { ok: true, landedOn: relativeRoute(page.url()) };
}

async function inspectQuickCheck(page) {
  const route = relativeRoute(page.url());
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

async function submitCurrentQuickCheck(page, activityUrl) {
  const quickCheck = await inspectQuickCheck(page);
  report.activitiesVisited.push({ activityUrl, quickCheck });
  if (!quickCheck.hasForm || !quickCheck.submitEnabled) return false;

  const beforeScreenshot = path.join(outputDir, "before-submit.png");
  await page.screenshot({ path: beforeScreenshot, fullPage: true, animations: "disabled", caret: "hide" });
  const answers = await answerVisibleQuestions(page);
  const submit = page.locator('form#verificacao button[type="submit"]');
  if (await submit.isDisabled()) throw new Error("quick-check submit became disabled after answering");

  const beforeRoute = relativeRoute(page.url());
  await submit.click();
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const afterRoute = relativeRoute(page.url());
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

  if (["error", "pending", "unknown"].includes(outcome)) {
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
  const persistedRoute = relativeRoute(page.url());
  const persistenceScreenshot = path.join(outputDir, "after-reload.png");
  await page.screenshot({ path: persistenceScreenshot, fullPage: true, animations: "disabled", caret: "hide" }).catch(() => {});

  const passedPersisted = /Aprendizado registrado/i.test(persistedBody);
  const failedPersisted = /Revise e tente novamente/i.test(persistedBody);
  const attemptMetadata = persistedBody.match(/tentativa\s+\d+\s+de\s+\d+/i)?.[0] ?? null;
  const persistenceOk = outcome === "passed" ? passedPersisted : failedPersisted;

  report.persistence = {
    route: persistedRoute,
    outcome,
    passedPersisted,
    failedPersisted,
    attemptMetadata,
    ok: persistenceOk,
    screenshot: path.relative(process.cwd(), persistenceScreenshot),
  };

  if (!persistenceOk) throw new Error(`submitted result did not persist after clean reload (outcome=${outcome})`);
  return true;
}

async function tryActivityPage(page, url, source) {
  await page.goto(new URL(url, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  if (!/^\/empreendedor\/atividade\/[^/]+$/.test(new URL(page.url()).pathname)) return false;
  const activityUrl = page.url();
  const quick = await inspectQuickCheck(page);
  report.discovery.push({ source, opened: relativeRoute(activityUrl), kind: "activity", quick });
  if (quick.hasForm && quick.submitEnabled) return submitCurrentQuickCheck(page, activityUrl);
  report.activitiesVisited.push({ source, activityUrl, quickCheck: quick });
  return false;
}

async function tryJourneyPage(page, url, source) {
  await page.goto(new URL(url, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  const journeyPath = new URL(page.url()).pathname;
  if (!/^\/empreendedor\/jornada\/[^/]+$/.test(journeyPath)) return false;
  report.journey = { route: relativeRoute(page.url()), source };

  const directLinks = await page.locator('a[href^="/empreendedor/atividade/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
  for (const href of directLinks) {
    if (await tryActivityPage(page, href, `${journeyPath}:activity-link`)) return true;
    await page.goto(new URL(url, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
  }

  const forms = page.locator('form:has(input[name="step_instance_id"])');
  const count = await forms.count();
  for (let index = 0; index < count; index += 1) {
    await page.goto(new URL(url, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const currentForms = page.locator('form:has(input[name="step_instance_id"])');
    if (index >= await currentForms.count()) continue;
    const form = currentForms.nth(index);
    const button = form.locator('button[type="submit"]');
    if (!(await button.count()) || await button.isDisabled()) continue;
    const stepId = await form.locator('input[name="step_instance_id"]').inputValue().catch(() => null);
    const stepStatus = await form.locator('input[name="step_status"]').inputValue().catch(() => null);
    const buttonText = await button.innerText().catch(() => null);
    await button.click();
    await page.waitForURL((candidate) => candidate.pathname !== journeyPath, { timeout: 20_000 }).catch(() => {});
    await settle(page);
    report.discovery.push({ source: relativeRoute(url), kind: "activity-form", stepId, stepStatus, buttonText, landed: relativeRoute(page.url()) });
    if (/^\/empreendedor\/atividade\/[^/]+$/.test(new URL(page.url()).pathname)) {
      const activityUrl = page.url();
      const quick = await inspectQuickCheck(page);
      if (quick.hasForm && quick.submitEnabled) return submitCurrentQuickCheck(page, activityUrl);
      report.activitiesVisited.push({ source: relativeRoute(url), activityUrl, quickCheck: quick });
    }
  }
  return false;
}

async function discoverAndSubmit(page) {
  const routes = [
    "/empreendedor",
    "/empreendedor/trilhas",
    "/empreendedor/jornadas",
    "/empreendedor/competencias",
    "/empreendedor/resultado",
    "/empreendedor/validacao",
    "/empreendedor/pontuacao",
    "/empreendedor/mais",
  ];
  const seenJourneys = new Set();
  const seenActivities = new Set();

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    await settle(page);
    const final = relativeRoute(page.url());
    const body = await page.locator("body").innerText().catch(() => "");
    const journeyLinks = await page.locator('a[href^="/empreendedor/jornada/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
    const activityLinks = await page.locator('a[href^="/empreendedor/atividade/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")).filter(Boolean));
    const enrollmentForms = await page.locator('form:has(input[name="journey_version_id"]), form:has(input[name="journey_instance_id"])').count();
    report.discovery.push({ route, final, status: response?.status() ?? null, journeyLinks, activityLinks, enrollmentForms, bodyPreview: body.slice(0, 700) });

    for (const href of activityLinks) {
      if (seenActivities.has(href)) continue;
      seenActivities.add(href);
      if (await tryActivityPage(page, href, `${route}:activity-link`)) return true;
    }

    for (const href of journeyLinks) {
      if (seenJourneys.has(href)) continue;
      seenJourneys.add(href);
      if (await tryJourneyPage(page, href, `${route}:journey-link`)) return true;
    }

    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    await settle(page);
    const forms = page.locator('form:has(input[name="journey_version_id"]), form:has(input[name="journey_instance_id"])');
    const formCount = await forms.count();
    for (let index = 0; index < formCount; index += 1) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
      await settle(page);
      const currentForms = page.locator('form:has(input[name="journey_version_id"]), form:has(input[name="journey_instance_id"])');
      if (index >= await currentForms.count()) continue;
      const form = currentForms.nth(index);
      const button = form.locator('button[type="submit"]');
      if (!(await button.count()) || await button.isDisabled()) continue;
      const buttonText = await button.innerText().catch(() => null);
      await button.click();
      await page.waitForURL((candidate) => candidate.pathname !== route, { timeout: 20_000 }).catch(() => {});
      await settle(page);
      report.discovery.push({ route, kind: "journey-form", buttonText, landed: relativeRoute(page.url()) });
      if (/^\/empreendedor\/jornada\/[^/]+$/.test(new URL(page.url()).pathname)) {
        if (await tryJourneyPage(page, page.url(), `${route}:journey-form`)) return true;
      }
    }
  }

  throw new Error("no user-visible participant route exposed an enabled quick-check scenario");
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.failures.push(`pageerror: ${error.message}`));
  try {
    await signIn(page);
    await discoverAndSubmit(page);
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
console.log(JSON.stringify({ ok: report.ok, discovery: report.discovery, submitted: report.submitted, persistence: report.persistence, failures: report.failures }, null, 2));
if (!report.ok) process.exitCode = 1;
