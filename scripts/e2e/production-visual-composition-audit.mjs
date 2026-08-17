import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = ["E2E_TARGET_URL", "E2E_PARTICIPANT_EMAIL", "E2E_PARTICIPANT_PASSWORD", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"];
for (const name of requiredEnv) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);

const targetUrl = process.env.E2E_TARGET_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-visual");
const compositionDir = path.join(outputDir, "composition");
await mkdir(compositionDir, { recursive: true });

const viewports = [
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 },
];
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), checks: [], failures: [] };
const failure = (message) => report.failures.push(message);

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function signIn(page, email, password, expectedPrefix) {
  await page.goto(`${targetUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 });
  await settle(page);
  await page.goto(`${targetUrl}${expectedPrefix}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  if (!new URL(page.url()).pathname.startsWith(expectedPrefix)) throw new Error(`Authenticated session did not reach ${expectedPrefix}`);
}

async function auditParticipantLesson(page, viewport) {
  await page.goto(`${targetUrl}/empreendedor/jornadas`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);
  const journeyInput = page.locator('form:has(input[name="journey_instance_id"]) input[name="journey_instance_id"]').first();
  if (!(await journeyInput.count())) return failure(`participant ${viewport.key}: no enrolled journey was rendered; dynamic lesson coverage cannot run`);
  const journeyInstanceId = await journeyInput.inputValue();
  const journeyUrl = `${targetUrl}/empreendedor/jornada/${encodeURIComponent(journeyInstanceId)}`;
  await page.goto(journeyUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const completedStepInput = page.locator('form:has(input[name="step_instance_id"]):has(input[name="step_status"][value="completed"]) input[name="step_instance_id"]').first();
  if (!(await completedStepInput.count())) return failure(`participant ${viewport.key}: no completed activity exists in the discovered journey; refusing to mutate progress just to obtain a visual state`);
  const stepInstanceId = await completedStepInput.inputValue();
  await page.goto(`${journeyUrl}?conteudo=${encodeURIComponent(stepInstanceId)}#aula`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await settle(page);

  const lesson = page.locator("[data-journey-lesson], #aula").first();
  if (!(await lesson.count())) return failure(`participant ${viewport.key}: selected lesson state did not render #aula`);
  await page.evaluate(() => document.querySelector("#aula")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(250);

  const geometry = await page.evaluate(() => {
    const root = document.querySelector("[data-journey-outline-page]") ?? document.querySelector("#conteudo-principal > div");
    if (!root) return { missing: "journey-root" };
    const directSections = [...root.children].filter((node) => node.tagName === "SECTION");
    const hero = root.querySelector("[data-journey-hero]") ?? root.querySelector(":scope > header");
    const learningPath = root.querySelector("[data-journey-learning-path]") ?? directSections.find((node) => node.id !== "aula");
    const lessonNode = root.querySelector("[data-journey-lesson]") ?? root.querySelector("#aula");
    if (!hero || !learningPath || !lessonNode) return { missing: "journey-composition-node" };
    const box = (node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
    const rootRect = root.getBoundingClientRect();
    const rootStyle = getComputedStyle(root);
    const paddingLeft = Number.parseFloat(rootStyle.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(rootStyle.paddingRight) || 0;
    const contentWidth = rootRect.width - paddingLeft - paddingRight;
    const contentLeft = rootRect.left + paddingLeft;
    return {
      root: box(root), hero: box(hero), learningPath: box(learningPath), lesson: box(lessonNode), contentWidth, contentLeft,
      gridTemplateColumns: rootStyle.gridTemplateColumns,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    };
  });
  report.checks.push({ role: "participant", viewport: viewport.key, state: "journey-lesson-open", journeyInstanceId, stepInstanceId, url: page.url(), geometry });
  await page.screenshot({ path: path.join(compositionDir, `participant-lesson-open-${viewport.key}-viewport.png`), fullPage: false, animations: "disabled", caret: "hide" });
  await page.screenshot({ path: path.join(compositionDir, `participant-lesson-open-${viewport.key}-full.png`), fullPage: true, animations: "disabled", caret: "hide" });
  if (geometry.missing) return failure(`participant ${viewport.key}: composition audit missing ${geometry.missing}`);

  const tolerance = viewport.key === "mobile" ? 4 : 6;
  const minimumWidthRatio = viewport.key === "mobile" ? 0.96 : 0.9;
  for (const [name, item] of [["hero", geometry.hero], ["learning path", geometry.learningPath], ["lesson", geometry.lesson]]) {
    if (Math.abs(item.left - geometry.contentLeft) > tolerance) failure(`participant ${viewport.key}: ${name} is laterally displaced (${item.left.toFixed(1)} vs expected ${geometry.contentLeft.toFixed(1)})`);
    if (item.width < geometry.contentWidth * minimumWidthRatio) failure(`participant ${viewport.key}: ${name} is unnaturally narrow (${item.width.toFixed(1)} of ${geometry.contentWidth.toFixed(1)} px)`);
  }
  if (geometry.horizontalOverflow) failure(`participant ${viewport.key}: selected lesson state has horizontal overflow (${geometry.documentWidth}/${geometry.viewportWidth})`);
}

async function auditAdminCertificateOverflow(page, viewport) {
  if (viewport.key !== "mobile") return;
  for (const route of ["/admin/certificados", "/admin/gamificacao?tipo=certificados"]) {
    await page.goto(`${targetUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settle(page);
    const geometry = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }));
    report.checks.push({ role: "admin", viewport: viewport.key, state: route, url: page.url(), geometry });
    await page.screenshot({ path: path.join(compositionDir, `admin-${route.includes("gamificacao") ? "gamificacao-certificados" : "certificados"}-mobile.png`), fullPage: true, animations: "disabled", caret: "hide" });
    if (geometry.horizontalOverflow) failure(`admin mobile ${route}: horizontal overflow (${geometry.documentWidth}/${geometry.viewportWidth})`);
  }
}

try {
  const manifest = JSON.parse(await readFile(path.join(outputDir, "visual-manifest.json"), "utf8"));
  for (const warning of manifest.warnings ?? []) {
    if (/^(participant|admin) .*horizontal overflow detected$/u.test(String(warning))) failure(`existing visual crawl reported authenticated overflow: ${warning}`);
  }
} catch (error) {
  failure(`visual manifest unavailable for composition audit: ${error instanceof Error ? error.message : String(error)}`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const participantContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    try {
      const page = await participantContext.newPage();
      await signIn(page, process.env.E2E_PARTICIPANT_EMAIL, process.env.E2E_PARTICIPANT_PASSWORD, "/empreendedor");
      await auditParticipantLesson(page, viewport);
    } catch (error) { failure(`participant ${viewport.key}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { await participantContext.close(); }

    const adminContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    try {
      const page = await adminContext.newPage();
      await signIn(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, "/admin");
      await auditAdminCertificateOverflow(page, viewport);
    } catch (error) { failure(`admin ${viewport.key}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { await adminContext.close(); }
  }
} finally { await browser.close(); }

report.finishedAt = new Date().toISOString();
report.summary = { checks: report.checks.length, failures: report.failures.length };
await writeFile(path.join(outputDir, "visual-composition-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.summary));
if (report.failures.length) {
  console.error(report.failures.join("\n"));
  process.exitCode = 1;
}
