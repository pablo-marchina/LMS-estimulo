import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = ["E2E_TARGET_URL", "E2E_PARTICIPANT_EMAIL", "E2E_PARTICIPANT_PASSWORD"];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const targetUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-critical-flow");
await mkdir(outputDir, { recursive: true });

const viewports = [
  { key: "wide", width: 1695, height: 895 },
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 },
];

const report = {
  schemaVersion: 4,
  startedAt: new Date().toISOString(),
  targetUrl,
  captures: [],
  failures: [],
};

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function inspectLogin(page, viewport) {
  const metrics = await page.evaluate(() => {
    const email = document.querySelector('input[name="email"]');
    const password = document.querySelector('input[name="password"]');
    const reveal = document.querySelector('button[aria-label="Mostrar senha"], button[aria-label="Ocultar senha"]');
    const emailRect = email?.getBoundingClientRect() ?? null;
    const passwordRect = password?.getBoundingClientRect() ?? null;
    const revealRect = reveal?.getBoundingClientRect() ?? null;
    const viewportWidth = document.documentElement.clientWidth;
    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      email: emailRect ? { left: emailRect.left, top: emailRect.top, width: emailRect.width, height: emailRect.height } : null,
      password: passwordRect ? { left: passwordRect.left, top: passwordRect.top, width: passwordRect.width, height: passwordRect.height } : null,
      reveal: revealRect ? { left: revealRect.left, top: revealRect.top, width: revealRect.width, height: revealRect.height } : null,
    };
  });
  const violations = [];
  if (!metrics.email || !metrics.password || !metrics.reveal) violations.push("login email/password/reveal controls are incomplete");
  if (metrics.documentWidth > metrics.viewportWidth + 2) violations.push(`login horizontal overflow: ${metrics.documentWidth}/${metrics.viewportWidth}`);
  if (metrics.email && metrics.password) {
    if (Math.abs(metrics.email.width - metrics.password.width) > 2) violations.push(`login input width mismatch: ${metrics.email.width.toFixed(1)}px vs ${metrics.password.width.toFixed(1)}px`);
    if (Math.abs(metrics.email.left - metrics.password.left) > 2) violations.push(`login input left-edge mismatch: ${metrics.email.left.toFixed(1)}px vs ${metrics.password.left.toFixed(1)}px`);
  }
  if (metrics.password && metrics.reveal) {
    const passwordCenter = metrics.password.top + metrics.password.height / 2;
    const revealCenter = metrics.reveal.top + metrics.reveal.height / 2;
    if (Math.abs(passwordCenter - revealCenter) > 2) violations.push(`password reveal control is not vertically centered: delta=${Math.abs(passwordCenter - revealCenter).toFixed(1)}px`);
  }
  const screenshot = path.join(outputDir, `${viewport.key}-login.png`);
  await page.screenshot({ path: screenshot, fullPage: false, animations: "disabled", caret: "hide" });
  return { metrics, violations, screenshot: path.relative(process.cwd(), screenshot) };
}

async function signIn(page, viewport) {
  const response = await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  const login = await inspectLogin(page, viewport);
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/empreendedor"), { timeout: 30_000 });
  await settle(page);
  return login;
}

async function inspectHomeBanner(page, viewport) {
  await page.goto(`${targetUrl}/empreendedor`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  const metrics = await page.evaluate(() => {
    const slide = document.querySelector(".brand-carousel-slide");
    const image = slide?.querySelector(".brand-carousel-image");
    const slideRect = slide?.getBoundingClientRect() ?? null;
    const imageRect = image?.getBoundingClientRect() ?? null;
    return {
      slide: slideRect ? { width: slideRect.width, height: slideRect.height, ratio: slideRect.height > 0 ? slideRect.width / slideRect.height : null, className: slide?.className ?? "" } : null,
      image: imageRect ? { width: imageRect.width, height: imageRect.height } : null,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      bodyText: document.body.innerText.slice(0, 4000),
    };
  });
  const violations = [];
  if (metrics.documentWidth > metrics.viewportWidth + 2) violations.push(`home horizontal overflow: ${metrics.documentWidth}/${metrics.viewportWidth}`);
  if (metrics.slide) {
    if (viewport.width >= 768 && Math.abs((metrics.slide.ratio ?? 0) - 8 / 3) > 0.12) violations.push(`desktop announcement ratio is ${metrics.slide.ratio?.toFixed(3)}, expected 8:3`);
    if (viewport.width < 768 && metrics.slide.className.includes("max-md:!aspect-[4/5]") && Math.abs((metrics.slide.ratio ?? 0) - 4 / 5) > 0.08) violations.push(`mobile announcement ratio is ${metrics.slide.ratio?.toFixed(3)}, expected 4:5`);
    if (!metrics.image || Math.abs(metrics.image.width - metrics.slide.width) > 2 || Math.abs(metrics.image.height - metrics.slide.height) > 2) violations.push("announcement artwork does not fill its slide geometry");
  }
  if (/Application error|Internal Server Error/i.test(metrics.bodyText)) violations.push("home rendered a generic application error");
  const screenshot = path.join(outputDir, `${viewport.key}-home-banner.png`);
  await page.screenshot({ path: screenshot, fullPage: false, animations: "disabled", caret: "hide" });
  return { metrics, violations, screenshot: path.relative(process.cwd(), screenshot) };
}

async function inspectDiagnosticEntry(page, viewport) {
  const response = await page.goto(`${targetUrl}/empreendedor/diagnostico`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  const finalUrl = new URL(page.url());
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const violations = [];
  if (!response || response.status() >= 500) violations.push(`diagnostic entry HTTP ${response?.status() ?? "no response"}`);
  if (!finalUrl.pathname.startsWith("/empreendedor")) violations.push(`diagnostic entry escaped participant area: ${finalUrl.pathname}`);
  if (/Application error|Internal Server Error|Conteúdo não encontrado/i.test(bodyText)) violations.push("diagnostic entry rendered a generic or semantic error state");
  const screenshot = path.join(outputDir, `${viewport.key}-diagnostic-entry.png`);
  await page.screenshot({ path: screenshot, fullPage: false, animations: "disabled", caret: "hide" });
  return {
    finalRoute: `${finalUrl.pathname}${finalUrl.search}`,
    bodyLength: bodyText.trim().length,
    violations,
    screenshot: path.relative(process.cwd(), screenshot),
  };
}

async function openEnrolledJourney(page) {
  await page.goto(`${targetUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const forms = page.locator('form:has(input[name="journey_instance_id"])');
  if (await forms.count()) {
    await forms.first().locator('button[type="submit"]').click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  const link = page.locator('a[href^="/empreendedor/jornada/"]').first();
  if (await link.count()) {
    await link.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  const eligibleForms = page.locator('form:has(input[name="journey_version_id"])');
  if (await eligibleForms.count()) {
    const eligibleButton = eligibleForms.first().locator('button[type="submit"]');
    if (!(await eligibleButton.count()) || await eligibleButton.isDisabled()) throw new Error("eligible journey CTA is unavailable");
    await eligibleButton.click();
    await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
    await settle(page);
    return;
  }

  throw new Error("no enrolled or eligible journey CTA found");
}

async function openActivityThroughRealForm(page) {
  const forms = page.locator('form:has(input[name="step_instance_id"]):has(input[name="step_status"])');
  const count = await forms.count();
  if (!count) throw new Error("journey page exposed no activity form");

  let chosen = 0;
  for (let index = 0; index < count; index += 1) {
    const status = await forms.nth(index).locator('input[name="step_status"]').inputValue().catch(() => "");
    if (status === "completed" || status === "in_progress") {
      chosen = index;
      break;
    }
  }

  const form = forms.nth(chosen);
  const button = form.locator('button[type="submit"]');
  if (!(await button.count()) || await button.isDisabled()) throw new Error("selected activity CTA is unavailable");
  await button.click();
  await page.waitForURL((url) => /^\/empreendedor\/atividade\/[^/]+$/.test(url.pathname), { timeout: 30_000 });
  await settle(page);
}

async function inspectLesson(page, viewport) {
  const result = await page.evaluate(({ width, height }) => {
    const activityPage = document.querySelector("[data-activity-page]");
    const canvas = document.querySelector("[data-activity-page] > div");
    const lessonSurface = canvas?.querySelector("main") ?? null;
    const sections = Array.from(lessonSurface?.children ?? []).filter((node) => node instanceof HTMLElement);
    const contentHeader = lessonSurface?.querySelector("#conteudo > div:first-child") ?? null;
    const promptsHeader = lessonSurface?.querySelector("#prompts > div:first-child") ?? null;
    const evaluation = lessonSurface?.querySelector("#avaliacao") ?? null;
    const repeatedQuickCheckTitle = Array.from(evaluation?.querySelectorAll("h2") ?? []).some((node) => node.textContent?.includes("Registre o que ficou desta aula"));
    const quickCheckCard = evaluation?.querySelector(".brand-quick-check") ?? null;
    const h1 = document.querySelector("h1");
    const journeyProgress = document.querySelector('[aria-label="Seu progresso nesta jornada"]');
    const nextControl = [...document.querySelectorAll("button, a")].find((element) => element.textContent?.includes("Próxima aula"));
    const sourceEscapeHatchPresent = [...document.querySelectorAll("button, a")].some((element) => element.textContent?.trim() === "Abrir na fonte");
    const bodyText = document.body.innerText;
    const h1Rect = h1?.getBoundingClientRect() ?? null;
    const activityPageRect = activityPage?.getBoundingClientRect() ?? null;
    const canvasRect = canvas?.getBoundingClientRect() ?? null;
    const nextRect = nextControl?.getBoundingClientRect() ?? null;
    const effectivePadding = (node) => node ? Number.parseFloat(getComputedStyle(node).paddingLeft || "0") : null;
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const expectedCanvasLeft = canvasRect ? (viewportWidth - canvasRect.width) / 2 : null;
    const sectionRects = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      return {
        id: section.id || section.getAttribute("aria-label") || section.tagName,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      };
    });

    return {
      requestedViewport: { width, height },
      actualViewport: { width: viewportWidth, height: viewportHeight },
      documentWidth,
      horizontalOverflow: documentWidth > viewportWidth + 2,
      activityPage: activityPageRect ? { left: activityPageRect.left, right: activityPageRect.right, width: activityPageRect.width } : null,
      h1: h1Rect ? { top: h1Rect.top, left: h1Rect.left, width: h1Rect.width, height: h1Rect.height } : null,
      canvas: canvasRect ? { top: canvasRect.top, left: canvasRect.left, width: canvasRect.width, right: canvasRect.right } : null,
      canvasCenterDelta: canvasRect && expectedCanvasLeft !== null ? Math.abs(canvasRect.left - expectedCanvasLeft) : null,
      journeyHeroPresent: Boolean(journeyProgress),
      nextControl: nextRect ? { top: nextRect.top, left: nextRect.left, right: nextRect.right, bottom: nextRect.bottom } : null,
      sectionRects,
      contentPadding: effectivePadding(contentHeader),
      promptsPadding: effectivePadding(promptsHeader),
      repeatedQuickCheckTitle,
      hasQuickCheckCard: Boolean(quickCheckCard),
      sourceEscapeHatchPresent,
      genericErrorPresent: /Application error|Internal Server Error|Conteúdo não encontrado/i.test(bodyText),
    };
  }, viewport);

  const violations = [];
  if (result.horizontalOverflow) violations.push(`horizontal overflow: ${result.documentWidth}/${result.actualViewport.width}`);
  if (!result.activityPage) violations.push("dedicated activity page missing");
  if (!result.h1) violations.push("lesson H1 missing");
  else if (result.h1.top < 0 || result.h1.top > result.actualViewport.height * 0.5) violations.push(`lesson H1 outside first half of viewport: top=${result.h1.top.toFixed(1)}`);
  if (!result.canvas) violations.push("activity canvas missing");
  if (viewport.width >= 1024 && result.canvas) {
    if (result.canvas.width > 1160) violations.push(`activity canvas too wide: ${result.canvas.width.toFixed(1)}px`);
    if ((result.canvasCenterDelta ?? Infinity) > 48) violations.push(`activity canvas not centered: delta=${result.canvasCenterDelta?.toFixed(1)}px`);
  }
  if (result.journeyHeroPresent) violations.push("journey hero is still rendered on lesson screen");
  if (result.nextControl && (result.nextControl.left < -2 || result.nextControl.right > result.actualViewport.width + 2)) {
    violations.push("next lesson control is clipped horizontally");
  }

  const gapTolerance = 1.5;
  for (let index = 1; index < result.sectionRects.length; index += 1) {
    const previous = result.sectionRects[index - 1];
    const current = result.sectionRects[index];
    const gap = current.top - previous.bottom;
    if (Math.abs(gap) > gapTolerance) violations.push(`gap between ${previous.id} and ${current.id}: ${gap.toFixed(1)}px`);
  }

  if (result.contentPadding !== null && result.promptsPadding !== null && Math.abs(result.contentPadding - result.promptsPadding) > 1) {
    violations.push(`prompt/content horizontal inset mismatch ${result.promptsPadding}px vs ${result.contentPadding}px`);
  }
  if (result.repeatedQuickCheckTitle) violations.push("repeated verification heading is still visible");
  if (result.hasQuickCheckCard) violations.push("embedded verification still renders a nested quick-check card");
  if (result.sourceEscapeHatchPresent) violations.push("lesson still exposes the generic Abrir na fonte action");
  if (result.genericErrorPresent) violations.push("lesson rendered a generic or semantic error state");

  return { result, violations };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      const login = await signIn(page, viewport);
      const home = await inspectHomeBanner(page, viewport);
      const diagnostic = await inspectDiagnosticEntry(page, viewport);
      await openEnrolledJourney(page);
      await openActivityThroughRealForm(page);

      const finalUrl = new URL(page.url());
      if (!/^\/empreendedor\/atividade\/[^/]+$/.test(finalUrl.pathname) || !finalUrl.searchParams.get("journey")) {
        throw new Error(`activity CTA ended on non-canonical route: ${finalUrl.pathname}${finalUrl.search}`);
      }

      const { result, violations } = await inspectLesson(page, viewport);
      violations.push(...login.violations.map((violation) => `login: ${violation}`));
      violations.push(...home.violations.map((violation) => `home: ${violation}`));
      violations.push(...diagnostic.violations.map((violation) => `diagnostic: ${violation}`));
      if (pageErrors.length) violations.push(`${pageErrors.length} uncaught page error(s): ${pageErrors.join(" | ")}`);

      const firstFold = path.join(outputDir, `${viewport.key}-lesson-first-fold.png`);
      const fullPage = path.join(outputDir, `${viewport.key}-lesson-full.png`);
      await page.screenshot({ path: firstFold, fullPage: false, animations: "disabled", caret: "hide" });
      await page.screenshot({ path: fullPage, fullPage: true, animations: "disabled", caret: "hide" });

      const capture = {
        viewport,
        login,
        home,
        diagnostic,
        finalRoute: `${finalUrl.pathname}${finalUrl.search}`,
        metrics: result,
        pageErrors,
        violations,
        screenshots: [login.screenshot, home.screenshot, diagnostic.screenshot, path.relative(process.cwd(), firstFold), path.relative(process.cwd(), fullPage)],
      };
      report.captures.push(capture);
      for (const violation of violations) report.failures.push(`${viewport.key}: ${violation}`);
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
await writeFile(path.join(outputDir, "critical-flow-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const failure of report.failures) console.error(failure);
if (report.failures.length) process.exitCode = 1;