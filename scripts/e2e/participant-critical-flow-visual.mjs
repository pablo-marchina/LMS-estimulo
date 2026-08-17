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
  schemaVersion: 2,
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
  const expectedStep = await form.locator('input[name="step_instance_id"]').inputValue();
  await button.click();
  await page.waitForURL((url) => /^\/empreendedor\/jornada\/[^/]+$/.test(url.pathname) && url.searchParams.get("conteudo") === expectedStep, { timeout: 30_000 });
  await settle(page);
  await page.locator("[data-inline-lesson]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
}

async function inspectLesson(page, viewport) {
  const result = await page.evaluate(({ width, height }) => {
    const inlineLesson = document.querySelector("[data-inline-lesson]");
    const shell = inlineLesson?.querySelector("[data-unified-shell]") ?? null;
    const sections = Array.from(shell?.children ?? []).filter((node) => node instanceof HTMLElement);
    const contentHeader = shell?.querySelector("#conteudo > div:first-child") ?? null;
    const promptsHeader = shell?.querySelector("#prompts > div:first-child") ?? null;
    const evaluation = shell?.querySelector("#avaliacao") ?? null;
    const repeatedQuickCheckTitle = Array.from(evaluation?.querySelectorAll("h2") ?? []).some((node) => node.textContent?.includes("Registre o que ficou desta aula"));
    const quickCheckCard = evaluation?.querySelector(".brand-quick-check") ?? null;
    const lessonHeading = inlineLesson?.querySelector("aside h2") ?? null;
    const journeyProgress = document.querySelector('[aria-label="Seu progresso nesta jornada"]');
    const h1Count = document.querySelectorAll("h1").length;
    const effectivePadding = (node) => node ? Number.parseFloat(getComputedStyle(node).paddingLeft || "0") : null;
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const shellRect = shell?.getBoundingClientRect() ?? null;
    const lessonHeadingRect = lessonHeading?.getBoundingClientRect() ?? null;
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
      inlineLessonPresent: Boolean(inlineLesson),
      journeyHeroPresent: Boolean(journeyProgress),
      h1Count,
      shell: shellRect ? { left: shellRect.left, right: shellRect.right, width: shellRect.width } : null,
      lessonHeading: lessonHeadingRect ? { top: lessonHeadingRect.top, left: lessonHeadingRect.left, right: lessonHeadingRect.right } : null,
      sectionRects,
      contentPadding: effectivePadding(contentHeader),
      promptsPadding: effectivePadding(promptsHeader),
      repeatedQuickCheckTitle,
      hasQuickCheckCard: Boolean(quickCheckCard),
    };
  }, viewport);

  const violations = [];
  if (result.horizontalOverflow) violations.push(`horizontal overflow: ${result.documentWidth}/${result.actualViewport.width}`);
  if (!result.inlineLessonPresent) violations.push("inline lesson workspace missing");
  if (!result.journeyHeroPresent) violations.push("journey context disappeared while lesson is open");
  if (result.h1Count !== 1) violations.push(`expected exactly one page h1, found ${result.h1Count}`);
  if (!result.shell || result.shell.width <= 0) violations.push("unified lesson shell missing");
  if (!result.lessonHeading) violations.push("inline lesson heading missing");
  if (result.shell && (result.shell.left < -2 || result.shell.right > result.actualViewport.width + 2)) violations.push("lesson shell is clipped horizontally");

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
      if (!/^\/empreendedor\/jornada\/[^/]+$/.test(finalUrl.pathname) || !finalUrl.searchParams.get("conteudo")) {
        throw new Error(`activity CTA ended outside the inline journey route: ${finalUrl.pathname}${finalUrl.search}`);
      }

      const { result, violations } = await inspectLesson(page, viewport);
      if (pageErrors.length) violations.push(`${pageErrors.length} uncaught page error(s): ${pageErrors.join(" | ")}`);

      const firstFold = path.join(outputDir, `${viewport.key}-inline-lesson-first-fold.png`);
      const fullPage = path.join(outputDir, `${viewport.key}-inline-lesson-full.png`);
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
