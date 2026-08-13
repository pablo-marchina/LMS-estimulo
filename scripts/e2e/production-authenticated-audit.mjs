import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const requiredEnv = [
  "E2E_PRODUCTION_URL",
  "E2E_PARTICIPANT_EMAIL",
  "E2E_PARTICIPANT_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
];

for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const baseUrl = process.env.E2E_PRODUCTION_URL.replace(/\/$/, "");
const outputDir = path.resolve("artifacts/e2e-production");
await mkdir(outputDir, { recursive: true });

const adminRoutes = [
  "/admin",
  "/admin/b2b",
  "/admin/biblioteca",
  "/admin/biblioteca/entregas",
  "/admin/campanhas",
  "/admin/certificados",
  "/admin/comportamento",
  "/admin/configuracoes",
  "/admin/diagnostico",
  "/admin/diagnosticos-opcionais",
  "/admin/engajamento",
  "/admin/experiencia",
  "/admin/gamificacao",
  "/admin/integracoes",
  "/admin/operacao",
  "/admin/produto",
  "/admin/recompensas",
  "/admin/relatorios",
  "/admin/usuarios",
];

const participantStaticRoutes = [
  "/empreendedor",
  "/empreendedor/b2b",
  "/empreendedor/biblioteca",
  "/empreendedor/competencias",
  "/empreendedor/diagnostico",
  "/empreendedor/mais",
  "/empreendedor/perfil",
  "/empreendedor/pontuacao",
  "/empreendedor/resultado",
  "/empreendedor/trilhas",
  "/empreendedor/validacao",
];

const participantDynamicPatterns = [
  { key: "activity-step", regex: /^\/empreendedor\/atividade\/[^/]+$/ },
  { key: "competency", regex: /^\/empreendedor\/competencias\/[^/]+$/ },
  { key: "diagnostic", regex: /^\/empreendedor\/diagnostico\/[^/]+$/ },
  { key: "journey", regex: /^\/empreendedor\/jornada\/[^/]+$/ },
  { key: "journey-module", regex: /^\/empreendedor\/jornada\/[^/]+\/modulo\/[^/]+$/ },
  { key: "trail", regex: /^\/empreendedor\/trilha\/[^/]+$/ },
  { key: "trail-lesson", regex: /^\/empreendedor\/trilha\/[^/]+\/aula\/[^/]+$/ },
  { key: "validation-activity", regex: /^\/empreendedor\/validacao\/[^/]+$/ },
];

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  expectedRouteTemplates: {
    admin: adminRoutes.length,
    participantStatic: participantStaticRoutes.length,
    participantDynamic: participantDynamicPatterns.length,
    total: adminRoutes.length + participantStaticRoutes.length + participantDynamicPatterns.length,
  },
  roles: {},
  accessControl: [],
  criticalFailures: [],
  warnings: [],
};

function safeFileName(role, route) {
  const normalized = route === "/" ? "root" : route.replace(/^\//, "").replace(/[^a-zA-Z0-9._-]+/g, "__");
  return `${role}__${normalized}.png`;
}

function normalizeInternalHref(href) {
  try {
    const url = new URL(href, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function signIn(page, { email, password, role }) {
  const response = await page.goto(`${baseUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!response || response.status() >= 500) throw new Error(`${role}: login page unavailable (${response?.status() ?? "no response"})`);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Do not interrupt the Next.js Server Action before its redirect response has
  // committed Supabase's Set-Cookie headers. The production auth probe proved
  // that a fixed sleep can race the Server Action and create a false logout.
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});

  const body = await page.locator("body").innerText().catch(() => "");
  if (/E-mail ou senha inválidos|Confirme seu e-mail/i.test(body)) {
    throw new Error(`${role}: authentication rejected by application`);
  }

  const target = role === "admin" ? "/admin" : "/empreendedor";
  await page.goto(`${baseUrl}${target}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(500);
  const currentPath = new URL(page.url()).pathname;
  if (!currentPath.startsWith(target)) {
    throw new Error(`${role}: authenticated session did not reach ${target}; landed on ${currentPath}`);
  }
}

async function auditRole(browser, role, credentials, staticRoutes) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  const roleReport = {
    login: { ok: false },
    pages: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
    discoveredInternalLinks: [],
    dynamicCoverage: {},
  };
  report.roles[role] = roleReport;

  page.on("console", (message) => {
    if (message.type() === "error") {
      roleReport.consoleErrors.push({ url: page.url(), text: message.text().slice(0, 1000) });
    }
  });
  page.on("pageerror", (error) => {
    roleReport.pageErrors.push({ url: page.url(), message: error.message.slice(0, 1000) });
  });
  page.on("requestfailed", (request) => {
    roleReport.failedRequests.push({
      pageUrl: page.url(),
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      roleReport.serverErrors.push({ pageUrl: page.url(), status: response.status(), url: response.url() });
    }
  });

  try {
    await signIn(page, { ...credentials, role });
    roleReport.login = { ok: true, landedOn: new URL(page.url()).pathname };
  } catch (error) {
    roleReport.login = { ok: false, error: error instanceof Error ? error.message : String(error) };
    report.criticalFailures.push(roleReport.login.error);
    await context.close();
    return;
  }

  const queued = [...staticRoutes];
  const visited = new Set();
  const discovered = new Set();

  while (queued.length) {
    const route = queued.shift();
    if (!route || visited.has(route)) continue;
    visited.add(route);

    const started = Date.now();
    let response;
    let navigationError = null;
    try {
      response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(600);
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
    }

    const finalUrl = page.url();
    const finalPath = (() => {
      try { return new URL(finalUrl).pathname; } catch { return finalUrl; }
    })();
    const status = response?.status() ?? null;
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const title = await page.title().catch(() => "");
    const headings = await page.locator("h1, h2").allInnerTexts().catch(() => []);
    const controls = await page.evaluate(() => ({
      links: document.querySelectorAll("a[href]").length,
      buttons: document.querySelectorAll("button").length,
      inputs: document.querySelectorAll("input, textarea, select").length,
      forms: document.querySelectorAll("form").length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      unnamedButtons: Array.from(document.querySelectorAll("button")).filter((button) => {
        const element = button;
        const text = (element.textContent || "").trim();
        const aria = element.getAttribute("aria-label") || element.getAttribute("title") || "";
        return !text && !aria;
      }).length,
    })).catch(() => null);

    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || "")).catch(() => []);
    for (const href of hrefs) {
      const normalized = normalizeInternalHref(href);
      if (!normalized) continue;
      discovered.add(normalized);
      if (role === "participant") {
        const pathname = normalized.split("?")[0];
        if (participantDynamicPatterns.some(({ regex }) => regex.test(pathname)) && !visited.has(pathname) && !queued.includes(pathname)) {
          queued.push(pathname);
        }
      }
    }

    const screenshotPath = path.join(outputDir, safeFileName(role, route));
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    const pageResult = {
      requestedRoute: route,
      finalPath,
      status,
      navigationError,
      durationMs: Date.now() - started,
      title,
      headings: headings.slice(0, 12),
      bodyLength: bodyText.trim().length,
      controls,
      screenshot: path.relative(process.cwd(), screenshotPath),
    };
    roleReport.pages.push(pageResult);

    if (navigationError) report.criticalFailures.push(`${role} ${route}: navigation error: ${navigationError}`);
    if (status !== null && status >= 500) report.criticalFailures.push(`${role} ${route}: HTTP ${status}`);
    if (bodyText.trim().length < 20) report.criticalFailures.push(`${role} ${route}: page rendered effectively blank`);
    if (role === "admin" && staticRoutes.includes(route) && !finalPath.startsWith("/admin")) {
      report.criticalFailures.push(`admin ${route}: unexpected redirect to ${finalPath}`);
    }
    if (role === "participant" && staticRoutes.includes(route) && !finalPath.startsWith("/empreendedor")) {
      report.criticalFailures.push(`participant ${route}: unexpected redirect to ${finalPath}`);
    }
    if (controls?.horizontalOverflow) report.warnings.push(`${role} ${route}: horizontal overflow detected at 1440px`);
    if (controls?.unnamedButtons) report.warnings.push(`${role} ${route}: ${controls.unnamedButtons} button(s) without visible/accessibility name`);
  }

  roleReport.discoveredInternalLinks = [...discovered].sort();
  if (role === "participant") {
    for (const pattern of participantDynamicPatterns) {
      const matches = roleReport.pages
        .map((item) => item.requestedRoute)
        .filter((route) => pattern.regex.test(route));
      roleReport.dynamicCoverage[pattern.key] = matches;
      if (!matches.length) report.warnings.push(`participant dynamic route template not discovered: ${pattern.key}`);
    }
  }

  roleReport.summary = {
    pagesVisited: roleReport.pages.length,
    consoleErrors: roleReport.consoleErrors.length,
    pageErrors: roleReport.pageErrors.length,
    failedRequests: roleReport.failedRequests.length,
    serverErrors: roleReport.serverErrors.length,
  };

  if (roleReport.pageErrors.length) report.criticalFailures.push(`${role}: ${roleReport.pageErrors.length} uncaught page error(s)`);
  if (roleReport.serverErrors.length) report.criticalFailures.push(`${role}: ${roleReport.serverErrors.length} HTTP 5xx response(s) observed`);

  return { context, page };
}

const browser = await chromium.launch({ headless: true });
let participantSession;
let adminSession;
try {
  participantSession = await auditRole(
    browser,
    "participant",
    { email: process.env.E2E_PARTICIPANT_EMAIL, password: process.env.E2E_PARTICIPANT_PASSWORD },
    participantStaticRoutes,
  );
  adminSession = await auditRole(
    browser,
    "admin",
    { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
    adminRoutes,
  );

  if (participantSession?.page) {
    const page = participantSession.page;
    const response = await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    await page.waitForTimeout(500);
    const finalPath = new URL(page.url()).pathname;
    const blocked = !finalPath.startsWith("/admin");
    report.accessControl.push({ actor: "participant", target: "/admin", blocked, finalPath, status: response?.status() ?? null });
    if (!blocked) report.criticalFailures.push("authorization violation: participant account can render /admin");
  }

  if (adminSession?.page) {
    const page = adminSession.page;
    const response = await page.goto(`${baseUrl}/empreendedor`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    await page.waitForTimeout(500);
    const finalPath = new URL(page.url()).pathname;
    const blocked = !finalPath.startsWith("/empreendedor");
    report.accessControl.push({ actor: "admin", target: "/empreendedor", blocked, finalPath, status: response?.status() ?? null });
    if (!blocked) report.criticalFailures.push("authorization violation: admin-without-participant account can render /empreendedor");
  }
} finally {
  await participantSession?.context?.close().catch(() => {});
  await adminSession?.context?.close().catch(() => {});
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.summary = {
  criticalFailures: report.criticalFailures.length,
  warnings: report.warnings.length,
  adminPagesVisited: report.roles.admin?.pages?.length ?? 0,
  participantPagesVisited: report.roles.participant?.pages?.length ?? 0,
  participantDynamicTemplatesCovered: Object.values(report.roles.participant?.dynamicCoverage ?? {}).filter((matches) => matches.length > 0).length,
};

await writeFile(path.join(outputDir, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report.summary));
if (report.criticalFailures.length) {
  console.error(`Authenticated production audit found ${report.criticalFailures.length} critical failure(s). See artifact report.`);
  process.exitCode = 1;
} else {
  console.log("Authenticated production audit completed without critical failures.");
}
