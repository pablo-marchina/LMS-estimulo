import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

for (const name of ["E2E_TARGET_URL", "E2E_PARTICIPANT_EMAIL", "E2E_PARTICIPANT_PASSWORD"]) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const targetUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-visual");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const serverErrors = [];
page.on("response", (response) => {
  if (response.status() >= 500 && response.url().startsWith(targetUrl)) {
    serverErrors.push({ status: response.status(), url: response.url() });
  }
});

async function settle() {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

const result = {
  targetUrl,
  startedAt: new Date().toISOString(),
  journeyUrl: null,
  activityUrl: null,
  journeyTitle: null,
  activityTitle: null,
  serverErrors,
  passed: false,
};

try {
  await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 });
  await settle();

  await page.goto(`${targetUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle();
  if (!new URL(page.url()).pathname.startsWith("/empreendedor")) throw new Error(`participant session lost: ${page.url()}`);

  const journeyAction = page.locator('main form button:not([disabled]), main form [type="submit"]:not([disabled])').first();
  if (!(await journeyAction.count())) throw new Error("no enabled journey action found");
  await journeyAction.click();
  await page.waitForURL((url) => /^\/empreendedor\/jornada\/[0-9a-f-]+$/i.test(url.pathname), { timeout: 45_000 });
  await settle();

  result.journeyUrl = page.url();
  const journeyBody = await page.locator("body").innerText();
  if (/Conteúdo não encontrado|Página não encontrada/i.test(journeyBody)) throw new Error("journey rendered semantic not-found state");
  const journeyTitle = await page.locator("h1").first().innerText().catch(() => "");
  if (!journeyTitle.trim()) throw new Error("journey title missing");
  result.journeyTitle = journeyTitle.trim();
  if (!(await page.locator("ol form button:not([disabled])").count())) throw new Error("journey has no openable activity");

  const firstActivity = page.locator("ol form button:not([disabled])").first();
  await firstActivity.click();
  await page.waitForURL((url) => /^\/empreendedor\/jornada\/[0-9a-f-]+$/i.test(url.pathname) && url.searchParams.has("conteudo"), { timeout: 45_000 });
  await settle();

  result.activityUrl = page.url();
  const activityPanel = page.locator("#aula");
  await activityPanel.waitFor({ state: "visible", timeout: 30_000 });
  const activityBody = await activityPanel.innerText();
  if (!/Conteúdo aberto/i.test(activityBody)) throw new Error("inline activity workspace did not render");
  result.activityTitle = (await activityPanel.locator("h2").first().innerText().catch(() => "")).trim() || null;
  if (serverErrors.length) throw new Error(`server errors observed: ${JSON.stringify(serverErrors)}`);

  await page.screenshot({ path: path.join(outputDir, "participant-journey-smoke.png"), fullPage: true });
  result.passed = true;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputDir, "participant-journey-smoke.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await browser.close();
}

if (!result.passed) process.exitCode = 1;
