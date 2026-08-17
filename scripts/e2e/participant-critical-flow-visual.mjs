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
  schemaVersion: 3,
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

async function signIn(page) {
  const response = await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`login page unavailable (${response?.status() ?? "no response"})`);
  await page.locator('input[name="email"]').fill(process.env.E2E_PARTICIPANT_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.E2E_PARTICIPANT_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname.startsWith("/empreendedor"), { timeout: 30_000 });
  await settle(page);
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
      await signIn(page);
      await openEnrolledJourney(page);
      await openActivityThroughRealForm(page);

      const finalUrl = new URL(page.url());
      if (!/^\/empreendedor\/atividade\/[^/]+$/.test(finalUrl.pathname) || !finalUrl.searchParams.get("journey")) {
        throw new Error(`activity CTA ended on non-canonical route: ${finalUrl.pathname}${finalUrl.search}`);
      }

      const { result, violations } = await inspectLesson(page, viewport);
      if (pageErrors.length) violations.push(`${pageErrors.length} uncaught page error(s): ${pageErrors.join(" | ")}`);

      const firstFold = path.join(outputDir, `${viewport.key}-lesson-first-fold.png`);
      const fullPage = path.join(outputDir, `${viewport.key}-lesson-full.png`);
      await page.screenshot({ path: firstFold, fullPage: false, animations: "disabled", caret: "hide" });
      await page.screenshot({ path: fullPage, fullPage: true, animations: "disabled", caret: "hide" });

      const capture = {
        viewport,
        finalRoute: `${finalUrl.pathname}${finalUrl.search}`,
        metrics: result,
        pageErrors,
        violations,
        screenshots: [path.relative(process.cwd(), firstFold), path.relative(process.cwd(), fullPage)],
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
