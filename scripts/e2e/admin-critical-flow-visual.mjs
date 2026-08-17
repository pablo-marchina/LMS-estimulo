import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = ["E2E_TARGET_URL", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"];
for (const name of requiredEnv) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);

const targetUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-admin-critical");
await mkdir(outputDir, { recursive: true });

const viewports = [
  { key: "wide", width: 1695, height: 895 },
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 },
];
const routes = [
  { key: "certificados", path: "/admin/certificados" },
  { key: "gamificacao-certificados", path: "/admin/gamificacao?tipo=certificados" },
];
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), captures: [], failures: [] };

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function signIn(page) {
  const response = await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(process.env.E2E_ADMIN_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 30_000 });
  await settle(page);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      await signIn(page);
      for (const route of routes) {
        const response = await page.goto(`${targetUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await settle(page);
        const metrics = await page.evaluate(() => {
          const h1 = document.querySelector("h1");
          const h1Rect = h1?.getBoundingClientRect() ?? null;
          const width = document.documentElement.clientWidth;
          const height = document.documentElement.clientHeight;
          const documentWidth = document.documentElement.scrollWidth;
          return {
            viewportWidth: width,
            viewportHeight: height,
            documentWidth,
            horizontalOverflow: documentWidth > width + 2,
            bodyLength: document.body.innerText.trim().length,
            heading: h1Rect ? { top: h1Rect.top, left: h1Rect.left, right: h1Rect.right, width: h1Rect.width } : null,
          };
        });
        const violations = [];
        if (!response || response.status() >= 500) violations.push(`HTTP ${response?.status() ?? "no response"}`);
        if (metrics.bodyLength < 60) violations.push("page rendered insufficient meaningful content");
        if (metrics.horizontalOverflow) violations.push(`horizontal overflow: ${metrics.documentWidth}/${metrics.viewportWidth}`);
        if (metrics.heading?.top > metrics.viewportHeight * 0.65) violations.push(`primary heading starts too low: ${metrics.heading.top.toFixed(1)}px`);
        if (metrics.heading && (metrics.heading.left < -2 || metrics.heading.right > metrics.viewportWidth + 2)) violations.push("primary heading clipped horizontally");
        if (/Conteúdo não encontrado/i.test(await page.locator("body").innerText().catch(() => ""))) violations.push("semantic not-found state rendered");
        if (pageErrors.length) violations.push(`${pageErrors.length} uncaught page error(s)`);

        const screenshot = path.join(outputDir, `${viewport.key}-${route.key}.png`);
        await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
        report.captures.push({ viewport, route: route.path, finalUrl: page.url(), metrics, violations, screenshot: path.relative(process.cwd(), screenshot) });
        for (const violation of violations) report.failures.push(`${viewport.key} ${route.path}: ${violation}`);
        pageErrors.length = 0;
      }
    } catch (error) {
      report.failures.push(`${viewport.key}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.summary = { captures: report.captures.length, failures: report.failures.length };
await writeFile(path.join(outputDir, "admin-critical-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
for (const failure of report.failures) console.error(failure);
if (report.failures.length) process.exitCode = 1;
