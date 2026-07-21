import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = String(process.env.BROWSER_E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/u, "");
const e2eToken = process.env.BROWSER_E2E_TOKEN ?? "";
const debuggingPort = Number(process.env.BROWSER_E2E_CDP_PORT || 9222);
const artifactsDir = path.resolve(root, process.env.BROWSER_E2E_ARTIFACTS_DIR || ".artifacts/browser-e2e");

if (!e2eToken) throw new Error("BROWSER_E2E_TOKEN is required");
await mkdir(artifactsDir, { recursive: true });

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean)) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0) return result.stdout.trim();
  }
  throw new Error("Chrome/Chromium binary not found");
}

async function waitFor(check, message, timeoutMs = 25_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try { const result = await check(); if (result) return result; } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`${message}${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket; this.nextId = 1; this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result ?? {});
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP connection timed out")), 10_000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("CDP connection failed")); }, { once: true });
    });
    return new CdpClient(socket);
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP command timed out: ${method}`)); }, 20_000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
    return result.result?.value;
  }
  close() { this.socket.close(); }
}

const chrome = spawn(findChrome(), [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  `--remote-debugging-port=${debuggingPort}`, `--user-data-dir=${path.join(artifactsDir, "chrome-profile")}`, "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });
let client;
let step = "bootstrap";

async function ready() { await waitFor(() => client.evaluate("document.readyState === 'complete' && Boolean(document.body)"), "document did not become ready"); }
async function navigate(url) { await client.send("Page.navigate", { url }); await ready(); }
async function url() { return String(await client.evaluate("location.href")); }
async function waitUrl(fragment) { await waitFor(async () => (await url()).includes(fragment), `URL did not include ${fragment}`); await ready(); }
async function waitText(text) { await waitFor(() => client.evaluate(`document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`), `text not found: ${text}`); }
async function clickText(text) {
  const clicked = await client.evaluate(`(() => { const target=[...document.querySelectorAll('button,a')].find((element)=>element.textContent?.trim()===${JSON.stringify(text)}); if (!target) return false; target.click(); return true; })()`);
  assert.equal(clicked, true, `click target not found: ${text}`);
}

async function failure(error) {
  const data = { step, error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error), url: client ? await url().catch(() => null) : null, body: client ? await client.evaluate("document.body?.innerText ?? ''").catch(() => null) : null };
  await writeFile(path.join(artifactsDir, "failure.json"), JSON.stringify(data, null, 2), "utf8");
  if (client) {
    const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).catch(() => null);
    if (shot?.data) await writeFile(path.join(artifactsDir, "failure.png"), Buffer.from(shot.data, "base64"));
  }
}

try {
  await waitFor(async () => (await fetch(`http://127.0.0.1:${debuggingPort}/json/version`).catch(() => null))?.ok, "Chrome did not start");
  const target = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, { method: "PUT" })).json();
  client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("DOM.enable"), client.send("Network.enable")]);

  step = "reset synthetic backend";
  const reset = await fetch(`${baseUrl}/api/e2e/reset`, { method: "POST", headers: { "x-e2e-token": e2eToken } });
  assert.equal(reset.status, 200);

  step = "activate localhost-only synthetic session";
  const cookieResult = await client.send("Network.setCookie", {
    name: "estimulo_browser_e2e",
    value: e2eToken,
    url: baseUrl,
    httpOnly: true,
    secure: baseUrl.startsWith("https://"),
    sameSite: "Lax",
  });
  assert.equal(cookieResult.success, true, "synthetic session cookie was not accepted");
  await navigate(`${baseUrl}/empreendedor`);
  await waitUrl("/empreendedor");
  await waitText("Continue de onde parou");
  await waitText("Ranking de pontos");
  await waitText("Recompensas");

  step = "profile and library";
  await clickText("Perfil");
  await waitUrl("/empreendedor/perfil");
  await waitText("Histórico de pontuação");
  await clickText("Biblioteca");
  await waitUrl("/capacitacao/biblioteca");
  await waitText("Biblioteca de conteúdos");

  step = "journey and private evidence UI";
  await navigate(`${baseUrl}/empreendedor`);
  const opened = await client.evaluate(`(() => { const link=[...document.querySelectorAll('a')].find((item)=>/Continuar|Começar jornada|Abrir jornada/.test(item.textContent??'')); if (!link) return false; link.click(); return true; })()`);
  if (opened) {
    await waitFor(async () => (await url()).includes("/empreendedor/"), "journey did not open");
    const firstActivity = await client.evaluate(`(() => { const link=[...document.querySelectorAll('a')].find((item)=>/Começar atividade|Continuar atividade|Abrir atividade/.test(item.textContent??'')); if (!link) return false; link.click(); return true; })()`);
    if (firstActivity) {
      await waitUrl("/empreendedor/atividade/");
      assert.equal(await client.evaluate("!document.body.innerText.toLowerCase().includes('malware') && !document.body.innerText.toLowerCase().includes('scanner')"), true);
    }
  }

  step = "mobile brand";
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await navigate(`${baseUrl}/empreendedor`);
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true);
  assert.equal(await client.evaluate("getComputedStyle(document.body).fontFamily.toLowerCase().includes('poppins')"), true);
  assert.equal(await client.evaluate("Boolean(document.querySelector('img[src=\"/brand/estimulo-logo-horizontal-color.svg\"]'))"), true);

  await writeFile(path.join(artifactsDir, "result.json"), JSON.stringify({ status: "passed", mode: "synthetic", flows: ["token_session", "dashboard", "profile", "library", "journey", "private_evidence_ui", "mobile_brand"] }, null, 2), "utf8");
  process.stdout.write("[browser-e2e] synthetic vertical passed\n");
} catch (error) {
  await failure(error);
  throw error;
} finally {
  client?.close();
  chrome.kill("SIGTERM");
}
