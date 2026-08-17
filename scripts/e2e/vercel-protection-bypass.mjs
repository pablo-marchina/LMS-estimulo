import { chromium } from "playwright";

const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();
const targetUrl = (process.env.E2E_TARGET_URL || "").trim();

if (bypassSecret && targetUrl) {
  const targetOrigin = new URL(targetUrl).origin;
  const originalLaunch = chromium.launch.bind(chromium);

  chromium.launch = async (...args) => {
    const browser = await originalLaunch(...args);
    const originalNewContext = browser.newContext.bind(browser);

    browser.newContext = async (options = {}) => {
      const context = await originalNewContext(options);

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

      return context;
    };

    return browser;
  };
}
