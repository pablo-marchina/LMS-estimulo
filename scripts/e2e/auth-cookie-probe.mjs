import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const required = [
  "E2E_PRODUCTION_URL",
  "E2E_PARTICIPANT_EMAIL",
  "E2E_PARTICIPANT_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const baseUrl = process.env.E2E_PRODUCTION_URL.replace(/\/$/, "");
const out = path.resolve("artifacts/e2e-production");
await mkdir(out, { recursive: true });

function publicCookieMetadata(cookies) {
  return cookies.map(({ name, domain, path: cookiePath, expires, httpOnly, secure, sameSite }) => ({
    name,
    domain,
    path: cookiePath,
    expires,
    httpOnly,
    secure,
    sameSite,
  }));
}

async function snapshot(page, label) {
  const cookies = await page.context().cookies(baseUrl);
  return {
    label,
    url: page.url(),
    pathname: new URL(page.url()).pathname,
    cookieCount: cookies.length,
    cookies: publicCookieMetadata(cookies),
  };
}

async function probe(browser, role, email, password, target) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const result = { role, target, steps: [], mainResponses: [] };
  page.on("response", (response) => {
    if (response.request().resourceType() === "document") {
      result.mainResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto(`${baseUrl}/entrar`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  result.steps.push(await snapshot(page, "login-page"));
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Next.js Server Actions can take several seconds before the redirect response
  // commits Supabase's Set-Cookie headers. Never interrupt the in-flight submit.
  await page.waitForURL((url) => url.pathname !== "/entrar", { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  result.steps.push(await snapshot(page, "after-submit-settled"));

  const first = await page.goto(`${baseUrl}${target}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(1_000);
  result.firstTargetStatus = first?.status() ?? null;
  result.steps.push(await snapshot(page, "after-first-target"));

  const second = await page.goto(`${baseUrl}${target}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
  await page.waitForTimeout(1_000);
  result.secondTargetStatus = second?.status() ?? null;
  result.steps.push(await snapshot(page, "after-second-target"));

  await context.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [
    await probe(browser, "participant", process.env.E2E_PARTICIPANT_EMAIL, process.env.E2E_PARTICIPANT_PASSWORD, "/empreendedor"),
    await probe(browser, "admin", process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, "/admin"),
  ];
  await writeFile(path.join(out, "auth-cookie-probe.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(JSON.stringify(results.map((item) => ({
    role: item.role,
    steps: item.steps.map((step) => ({ label: step.label, pathname: step.pathname, cookieNames: step.cookies.map((cookie) => cookie.name) })),
  }))));
} finally {
  await browser.close();
}
