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
const referenceUrl = (process.env.E2E_REFERENCE_URL || "").trim().replace(/\/$/, "");
const maxPagesPerRole = Number.parseInt(process.env.E2E_VISUAL_MAX_PAGES || "80", 10);
if (!Number.isInteger(maxPagesPerRole) || maxPagesPerRole < 1) {
  throw new Error("E2E_VISUAL_MAX_PAGES must be a positive integer");
}

const outputDir = path.resolve("artifacts/e2e-visual");
await mkdir(outputDir, { recursive: true });

const viewports = [
  { key: "wide", width: 1695, height: 895 },
  { key: "desktop", width: 1440, height: 1000 },
  { key: "mobile", width: 390, height: 844 },
];

const publicRoutes = ["/", "/entrar", "/cadastro"];
const roleConfig = {
  participant: {
    scopePrefix: "/empreendedor",
    seeds: [
      "/empreendedor",
      "/empreendedor/b2b",
      "/empreendedor/biblioteca",
      "/empreendedor/diagnostico",
      "/empreendedor/jornadas",
      "/empreendedor/perfil",
      "/empreendedor/recompensas",
      "/empreendedor/resultado",
    ],
  },
  admin: {
    scopePrefix: "/admin",
    seeds: [
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
    ],
  },
};

const dynamicRouteTemplates = {
  participant: [
    { key: "activity-step", regex: /^\/empreendedor\/atividade\/[^/]+$/ },
    { key: "competency", regex: /^\/empreendedor\/competencias\/[^/]+$/ },
    { key: "diagnostic", regex: /^\/empreendedor\/diagnostico\/[^/]+$/ },
    { key: "journey", regex: /^\/empreendedor\/jornada\/[^/]+$/ },
    { key: "journey-module", regex: /^\/empreendedor\/jornada\/[^/]+\/modulo\/[^/]+$/ },
    { key: "trail", regex: /^\/empreendedor\/trilha\/[^/]+$/ },
    { key: "trail-lesson", regex: /^\/empreendedor\/trilha\/[^/]+\/aula\/[^/]+$/ },
    { key: "validation-activity", regex: /^\/empreendedor\/validacao\/[^/]+$/ },
  ],
  admin: [],
};

const uuidQueryValue = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const manifest = {
  schemaVersion: 2,
  startedAt: new Date().toISOString(),
  targetUrl,
  referenceUrl: referenceUrl || null,
  maxPagesPerRole,
  viewports,
  captures: [],
  failures: [],
  warnings: [],
};

function parsedRoute(value) {
  try {
    const url = new URL(value, targetUrl);
    return { pathname: url.pathname, search: url.search };
  } catch {
    const [pathname = value] = String(value).split(/[?#]/, 1);
    return { pathname, search: "" };
  }
}

function safeSegment(value) {
  const { pathname, search } = parsedRoute(value);
  const pathnameSegment = pathname.replace(/^\/+/, "").replace(/[^a-zA-Z0-9._-]+/g, "__") || "root";
  if (!search) return pathnameSegment;
  const querySegment = search
    .slice(1)
    .replace(/&/g, "__and__")
    .replace(/=/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "__");
  return `${pathnameSegment}__q__${querySegment || "query"}`;
}

function normalizedCoverageSearch(search) {
  if (!search) return "";
  const params = new URLSearchParams(search);
  for (const [key, value] of [...params.entries()]) {
    if (uuidQueryValue.test(value)) params.set(key, "__uuid__");
  }
  const normalized = params.toString();
  return normalized ? `?${normalized}` : "";
}

function routeCoverageKey(role, route) {
  const { pathname, search } = parsedRoute(route);
  const template = dynamicRouteTemplates[role]?.find(({ regex }) => regex.test(pathname));
  return template ? `template:${template.key}` : `route:${pathname}${normalizedCoverageSearch(search)}`;
}

function normalizeScopedHref(href, scopePrefix) {
  if (!href) return null;
  try {
    const url = new URL(href, targetUrl);
    if (url.origin !== new URL(targetUrl).origin) return null;
    if (!url.pathname.startsWith(scopePrefix)) return null;
    if (/\/(?:sair|logout)(?:\/|$)/i.test(url.pathname)) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.waitForTimeout(350);
}

async function signIn(page, { email, password, role }) {
  const response = await page.goto(`${targetUrl}/entrar`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response || response.status() >= 500) {
    throw new Error(`${role}: login page unavailable (${response?.status() ?? "no response"})`);
  }

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 }).catch(() => {});
  await settle(page);

  const body = await page.locator("body").innerText().catch(() => "");
  if (/E-mail ou senha inválidos|Confirme seu e-mail/i.test(body)) {
    throw new Error(`${role}: authentication rejected by application`);
  }

  const expectedPrefix = roleConfig[role].scopePrefix;
  await page.goto(`${targetUrl}${expectedPrefix}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await settle(page);
  const currentPath = new URL(page.url()).pathname;
  if (!currentPath.startsWith(expectedPrefix)) {
    throw new Error(`${role}: authenticated session did not reach ${expectedPrefix}; landed on ${currentPath}`);
  }
}

async function capturePage({ page, role, viewport, requestedUrl, filePath }) {
  const startedAt = Date.now();
  let response = null;
  let navigationError = null;
  try {
    response = await page.goto(requestedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await settle(page);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const finalUrl = page.url();
  const finalRoute = (() => {
    try {
      const url = new URL(finalUrl);
      return `${url.pathname}${url.search}`;
    } catch {
      return finalUrl;
    }
  })();
  const finalPath = parsedRoute(finalUrl).pathname;
  const status = response?.status() ?? null;
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const title = await page.title().catch(() => "");
  const headings = await page.locator("h1, h2").allInnerTexts().catch(() => []);
  const layout = await page
    .evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    }))
    .catch(() => null);

  await mkdir(path.dirname(filePath), { recursive: true });
  let screenshotError = null;
  try {
    await page.screenshot({
      path: filePath,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
    });
  } catch (error) {
    screenshotError = error instanceof Error ? error.message : String(error);
  }

  const record = {
    role,
    viewport: viewport.key,
    requestedUrl,
    finalUrl,
    finalRoute,
    finalPath,
    status,
    navigationError,
    screenshotError,
    title,
    headings: headings.slice(0, 12),
    bodyLength: bodyText.trim().length,
    layout,
    durationMs: Date.now() - startedAt,
    screenshot: screenshotError ? null : path.relative(process.cwd(), filePath),
  };
  manifest.captures.push(record);

  const authenticatedRole = role === "participant" || role === "admin";
  if (navigationError) manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: ${navigationError}`);
  if (status !== null && status >= 500) manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: HTTP ${status}`);
  if (bodyText.trim().length < 20) {
    manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: page rendered effectively blank`);
  } else if (authenticatedRole && bodyText.trim().length < 60) {
    manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: authenticated page rendered insufficient meaningful content`);
  }
  if (authenticatedRole && /Conteúdo não encontrado/i.test(bodyText)) {
    manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: rendered semantic not-found state`);
  }
  if (screenshotError) manifest.failures.push(`${role} ${viewport.key} ${requestedUrl}: screenshot failed: ${screenshotError}`);
  if (layout?.horizontalOverflow) manifest.warnings.push(`${role} ${viewport.key} ${requestedUrl}: horizontal overflow detected`);

  return record;
}

async function capturePublic(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  try {
    for (const route of publicRoutes) {
      const filePath = path.join(outputDir, "public", viewport.key, `${safeSegment(route)}.png`);
      await capturePage({
        page,
        role: "public",
        viewport,
        requestedUrl: `${targetUrl}${route}`,
        filePath,
      });
    }
  } finally {
    await context.close();
  }
}

async function captureRole(browser, role, credentials, viewport) {
  const { scopePrefix, seeds } = roleConfig[role];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 1000)));

  try {
    await signIn(page, { ...credentials, role });

    const queue = [...seeds];
    const visited = new Set();
    const queuedCoverage = new Set(seeds.map((route) => routeCoverageKey(role, route)));
    while (queue.length && visited.size < maxPagesPerRole) {
      const route = queue.shift();
      if (!route || visited.has(route)) continue;
      visited.add(route);

      const filePath = path.join(outputDir, role, viewport.key, `${safeSegment(route)}.png`);
      const record = await capturePage({
        page,
        role,
        viewport,
        requestedUrl: `${targetUrl}${route}`,
        filePath,
      });

      if (!record.finalPath.startsWith(scopePrefix)) {
        manifest.failures.push(`${role} ${viewport.key} ${route}: unexpected redirect to ${record.finalRoute}`);
        continue;
      }

      const hrefs = await page
        .locator("a[href]")
        .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") || ""))
        .catch(() => []);
      for (const href of hrefs) {
        const discovered = normalizeScopedHref(href, scopePrefix);
        if (!discovered || visited.has(discovered)) continue;
        const coverageKey = routeCoverageKey(role, discovered);
        if (queuedCoverage.has(coverageKey)) continue;
        queuedCoverage.add(coverageKey);
        queue.push(discovered);
      }
    }

    if (queue.length) {
      manifest.warnings.push(`${role} ${viewport.key}: route crawl capped at ${maxPagesPerRole} pages`);
    }
    if (pageErrors.length) {
      manifest.failures.push(`${role} ${viewport.key}: ${pageErrors.length} uncaught page error(s)`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    manifest.failures.push(`${role} ${viewport.key}: ${message}`);
  } finally {
    await context.close();
  }
}

async function captureReference(browser, viewport) {
  if (!referenceUrl) return;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();
  try {
    const filePath = path.join(outputDir, "reference", viewport.key, "landing.png");
    await capturePage({
      page,
      role: "reference",
      viewport,
      requestedUrl: referenceUrl,
      filePath,
    });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    await captureReference(browser, viewport);
    await capturePublic(browser, viewport);
    await captureRole(
      browser,
      "participant",
      {
        email: process.env.E2E_PARTICIPANT_EMAIL,
        password: process.env.E2E_PARTICIPANT_PASSWORD,
      },
      viewport,
    );
    await captureRole(
      browser,
      "admin",
      {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
      viewport,
    );
  }
} finally {
  await browser.close();
}

manifest.finishedAt = new Date().toISOString();
manifest.summary = {
  captures: manifest.captures.length,
  screenshots: manifest.captures.filter((item) => item.screenshot).length,
  failures: manifest.failures.length,
  warnings: manifest.warnings.length,
  byRole: Object.fromEntries(
    ["reference", "public", "participant", "admin"].map((role) => [
      role,
      manifest.captures.filter((item) => item.role === role).length,
    ]),
  ),
};

await writeFile(path.join(outputDir, "visual-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify(manifest.summary));
if (manifest.failures.length) {
  console.error(`Visual capture found ${manifest.failures.length} failure(s). Evidence was still uploaded.`);
  process.exitCode = 1;
} else {
  console.log("Visual capture completed without critical failures.");
}
