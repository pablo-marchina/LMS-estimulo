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
  catalog: null,
  firstOpen: null,
  reopen: null,
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
  await page.waitForTimeout(600);
}

async function shot(page, name) {
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

async function openJourneyViaVisibleNav(page) {
  const journeysLink = page.getByRole("link", { name: "Jornadas", exact: true }).first();
  if (!(await journeysLink.count()) || !(await journeysLink.isVisible())) throw new Error("participant Jornadas navigation link is not visible");
  await journeysLink.click();
  await page.waitForURL((url) => url.pathname === "/empreendedor/jornadas", { timeout: 30_000 });
  await settle(page);

  const body = await page.locator("body").innerText();
  if (!body.includes(target.journeyTitle)) throw new Error("target journey is not visible in participant catalog");
  const form = page.locator(`form:has(input[name="journey_instance_id"][value="${target.journeyInstanceId}"])`).first();
  if (!(await form.count())) throw new Error("target journey has no visible participant form");
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) throw new Error("target journey CTA is unavailable");
  const buttonText = (await button.innerText()).trim();
  const screenshot = await shot(page, "01-catalog-after-approved-submit.png");
  await button.click();
  await page.waitForURL((url) => url.pathname === `/empreendedor/jornada/${target.journeyInstanceId}`, { timeout: 45_000 });
  await settle(page);
  report.catalog = { buttonText, route: routeOf(page.url()), screenshot };
}

async function openTargetLesson(page, screenshotName) {
  const body = await page.locator("body").innerText();
  if (!body.includes(target.activityTitle)) throw new Error("target lesson is not visible in journey");
  const form = page.locator(`form:has(input[name="step_instance_id"][value="${target.stepInstanceId}"])`).first();
  if (!(await form.count())) throw new Error("target lesson participant form is missing");
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) throw new Error("target lesson CTA is unavailable");
  if (!(await button.isVisible())) {
    const details = form.locator("xpath=ancestor::details[1]");
    if (await details.count()) await details.locator("summary").first().click();
    await page.waitForTimeout(300);
  }
  if (!(await button.isVisible())) throw new Error("target lesson CTA is not visible");
  const buttonText = (await button.innerText()).trim();
  const journeyShot = await shot(page, screenshotName);
  await button.click();
  await page.waitForURL((url) => url.pathname === `/empreendedor/atividade/${target.stepInstanceId}`, { timeout: 45_000 });
  await settle(page);
  if (!(await page.locator("body").innerText()).includes(target.activityTitle)) throw new Error("target activity did not render");
  return { buttonText, route: routeOf(page.url()), journeyShot };
}

async function assertApprovedState(page, screenshotName) {
  const body = await page.locator("body").innerText();
  const registered = /Aprendizado registrado/i.test(body);
  const cardVisible = await page.locator('#verificacao:has-text("Aprendizado registrado")').isVisible().catch(() => false);
  const formPresent = (await page.locator("form#verificacao").count()) > 0;
  const screenshot = await shot(page, screenshotName);
  return { registered, cardVisible, formPresent, route: routeOf(page.url()), screenshot, ok: registered && cardVisible && !formPresent };
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.failures.push(`pageerror: ${error.message}`));
  try {
    await signIn(page);
    await openJourneyViaVisibleNav(page);
    report.firstOpen = await openTargetLesson(page, "02-journey-before-first-open.png");

    const firstState = await assertApprovedState(page, "03-approved-result-visible.png");
    if (!firstState.ok) throw new Error("approved result is not visible after opening the lesson from the journey");

    const back = page.getByRole("link", { name: "Voltar para a jornada", exact: true }).first();
    if (!(await back.count()) || !(await back.isVisible())) throw new Error("Voltar para a jornada link is not visible");
    await back.click();
    await page.waitForURL((url) => url.pathname === `/empreendedor/jornada/${target.journeyInstanceId}`, { timeout: 45_000 });
    await settle(page);

    report.reopen = await openTargetLesson(page, "04-journey-before-reopen.png");
    const beforeReload = await assertApprovedState(page, "05-approved-after-reopen.png");
    if (!beforeReload.ok) throw new Error("approved result disappeared after reopening the lesson");

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const afterReload = await assertApprovedState(page, "06-approved-after-clean-reload.png");
    report.persistence = { beforeReload, afterReload, ok: beforeReload.ok && afterReload.ok };
    if (!report.persistence.ok) throw new Error("approved result did not persist through reopening and clean reload");
  } catch (error) {
    report.failures.push(error instanceof Error ? error.message : String(error));
    await shot(page, "99-failure-state.png").catch(() => {});
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.ok = Boolean(report.persistence?.ok && report.failures.length === 0);
await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
