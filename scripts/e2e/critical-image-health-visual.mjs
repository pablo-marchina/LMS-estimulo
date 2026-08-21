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
const outputDir = path.resolve("artifacts/e2e-image-health");
await mkdir(outputDir, { recursive: true });

const viewports = [
  { key: "wide", width: 1695, height: 895 },
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 },
];

const roleConfig = {
  participant: {
    email: process.env.E2E_PARTICIPANT_EMAIL,
    password: process.env.E2E_PARTICIPANT_PASSWORD,
    expectedPrefix: "/empreendedor",
    routes: [
      { key: "home", path: "/empreendedor", requireImage: true },
      { key: "jornadas", path: "/empreendedor/jornadas", requireImage: true },
      { key: "recompensas", path: "/empreendedor/recompensas", requireImage: true },
    ],
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    expectedPrefix: "/admin",
    routes: [
      { key: "biblioteca", path: "/admin/biblioteca?view=conteudos", requireImage: false },
      { key: "certificados", path: "/admin/certificados", requireImage: false },
      { key: "gamificacao", path: "/admin/gamificacao?tipo=certificados", requireImage: false },
    ],
  },
};

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  targetUrl,
  captures: [],
  failures: [],
};

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(450);
}

async function signIn(page, role) {
  const config = roleConfig[role];
  const response = await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`${role}: login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(config.email);
  await page.locator('input[name="password"]').fill(config.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 });
  await settle(page);

  await page.goto(`${targetUrl}${config.expectedPrefix}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  const current = new URL(page.url());
  if (!current.pathname.startsWith(config.expectedPrefix)) {
    throw new Error(`${role}: authenticated session landed on ${current.pathname}`);
  }
}

async function activateAndInspectImages(page) {
  await page.locator("img").evaluateAll((images) => {
    for (const image of images) image.loading = "eager";
  }).catch(() => {});

  const totalHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const step = Math.max(320, Math.floor(viewportHeight * 0.8));
  for (let y = 0; y < totalHeight; y += step) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(650);

  return page.locator("img").evaluateAll((images) => images.map((image) => {
    const rect = image.getBoundingClientRect();
    const src = image.currentSrc || image.getAttribute("src") || "";
    return {
      src,
      alt: image.getAttribute("alt") || "",
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
    };
  }).filter((image) => image.src && image.renderedWidth > 1 && image.renderedHeight > 1));
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const role of ["participant", "admin"]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        ignoreHTTPSErrors: false,
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1000)));
      try {
        await signIn(page, role);
        for (const route of roleConfig[role].routes) {
          const response = await page.goto(`${targetUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
          await settle(page);
          const images = await activateAndInspectImages(page);
          const brokenImages = images.filter((image) => image.complete && image.naturalWidth === 0);
          const body = await page.locator("body").innerText().catch(() => "");
          const finalUrl = page.url();
          const violations = [];

          if (!response || response.status() >= 500) violations.push(`HTTP ${response?.status() ?? "no response"}`);
          if (!new URL(finalUrl).pathname.startsWith(roleConfig[role].expectedPrefix)) violations.push(`unexpected redirect to ${finalUrl}`);
          if (body.trim().length < 60) violations.push("page rendered insufficient meaningful content");
          if (/Conteúdo não encontrado/i.test(body)) violations.push("semantic not-found state rendered");
          if (route.requireImage && images.length === 0) violations.push("page expected visual media but rendered no image elements");
          for (const image of brokenImages) {
            violations.push(`broken image: ${image.alt || "(no alt)"} :: ${image.src}`);
          }
          if (pageErrors.length) violations.push(`${pageErrors.length} uncaught page error(s): ${pageErrors.join(" | ")}`);

          const screenshot = path.join(outputDir, `${viewport.key}-${role}-${route.key}.png`);
          await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled", caret: "hide" });
          report.captures.push({
            viewport,
            role,
            route: route.path,
            finalUrl,
            imageCount: images.length,
            brokenImageCount: brokenImages.length,
            brokenImages,
            violations,
            screenshot: path.relative(process.cwd(), screenshot),
          });
          for (const violation of violations) report.failures.push(`${viewport.key} ${role} ${route.path}: ${violation}`);
          pageErrors.length = 0;
        }
      } catch (error) {
        report.failures.push(`${viewport.key} ${role}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.summary = {
  captures: report.captures.length,
  screenshots: report.captures.filter((capture) => capture.screenshot).length,
  images: report.captures.reduce((total, capture) => total + capture.imageCount, 0),
  brokenImages: report.captures.reduce((total, capture) => total + capture.brokenImageCount, 0),
  failures: report.failures.length,
};
await writeFile(path.join(outputDir, "critical-image-health-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
for (const failure of report.failures) console.error(failure);
if (report.failures.length) process.exitCode = 1;
