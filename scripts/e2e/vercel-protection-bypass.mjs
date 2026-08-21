import { chromium } from "playwright";

const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();
const shareUrl = (process.env.E2E_VERCEL_SHARE_URL || "").trim();
const targetUrl = (process.env.E2E_TARGET_URL || "").trim();

if ((bypassSecret || shareUrl) && targetUrl) {
  const targetOrigin = new URL(targetUrl).origin;
  const originalLaunch = chromium.launch.bind(chromium);

  chromium.launch = async (...args) => {
    const browser = await originalLaunch(...args);
    const originalNewContext = browser.newContext.bind(browser);

    browser.newContext = async (options = {}) => {
      const context = await originalNewContext(options);

      if (bypassSecret) {
        await context.route("**/*", async (route) => {
          const request = route.request();
          let sameTargetOrigin = false;
          try {
            sameTargetOrigin = new URL(request.url()).origin === targetOrigin;
          } catch {
            sameTargetOrigin = false;
          }

          if (!sameTargetOrigin) {
            await route.continue();
            return;
          }

          await route.continue({
            headers: {
              ...request.headers(),
              "x-vercel-protection-bypass": bypassSecret,
              "x-vercel-set-bypass-cookie": "true",
            },
          });
        });
      }

      if (shareUrl) {
        const parsedShareUrl = new URL(shareUrl);
        if (parsedShareUrl.origin !== targetOrigin) {
          await context.close();
          throw new Error("E2E_VERCEL_SHARE_URL must use the audited target origin");
        }

        const bootstrapPage = await context.newPage();
        try {
          const response = await bootstrapPage.goto(shareUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          if (!response || response.status() >= 500) {
            throw new Error(`Vercel share bootstrap failed (${response?.status() ?? "no response"})`);
          }
          await bootstrapPage.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
          if (new URL(bootstrapPage.url()).origin !== targetOrigin) {
            throw new Error(`Vercel share bootstrap escaped target origin: ${bootstrapPage.url()}`);
          }
        } finally {
          await bootstrapPage.close();
        }
      }

      return context;
    };

    return browser;
  };
}
