import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = String(process.env.REAL_E2E_BASE_URL ?? "").replace(/\/$/u, "");
const participantEmail = process.env.REAL_E2E_PARTICIPANT_EMAIL ?? "";
const participantPassword = process.env.REAL_E2E_PARTICIPANT_PASSWORD ?? "";
const adminSessionCookiesFile = process.env.REAL_E2E_ADMIN_SESSION_COOKIES_FILE ?? "";
const artifactsDir = path.resolve(root, process.env.REAL_E2E_ARTIFACTS_DIR || ".artifacts/real-browser-e2e");
const debuggingPort = Number(process.env.REAL_E2E_CDP_PORT || 9333);

if (!baseUrl || !participantEmail || !participantPassword || !adminSessionCookiesFile) {
  throw new Error("REAL_E2E_BASE_URL, participant credentials and REAL_E2E_ADMIN_SESSION_COOKIES_FILE are required");
}
const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.protocol !== "https:" && parsedBaseUrl.hostname !== "127.0.0.1" && parsedBaseUrl.hostname !== "localhost") {
  throw new Error("REAL_E2E_BASE_URL must use HTTPS outside localhost");
}

const rawAdminCookies = JSON.parse(await readFile(path.resolve(root, adminSessionCookiesFile), "utf8"));
if (!Array.isArray(rawAdminCookies) || rawAdminCookies.length === 0) {
  throw new Error("REAL_E2E_ADMIN_SESSION_COOKIES_FILE must contain a non-empty JSON cookie array");
}
const adminCookies = rawAdminCookies.map((entry, index) => {
  if (!entry || typeof entry !== "object" || typeof entry.name !== "string" || typeof entry.value !== "string") {
    throw new Error(`invalid admin session cookie at index ${index}`);
  }
  const cookie = { ...entry };
  if (typeof cookie.url === "string") {
    const cookieUrl = new URL(cookie.url);
    if (cookieUrl.origin !== parsedBaseUrl.origin) throw new Error(`admin cookie ${cookie.name} targets another origin`);
  } else if (typeof cookie.domain === "string") {
    const domain = cookie.domain.replace(/^\./u, "").toLowerCase();
    const host = parsedBaseUrl.hostname.toLowerCase();
    if (host !== domain && !host.endsWith(`.${domain}`)) throw new Error(`admin cookie ${cookie.name} targets another domain`);
  } else {
    cookie.url = parsedBaseUrl.origin;
  }
  return cookie;
});
await mkdir(artifactsDir, { recursive: true });

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean)) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0) return result.stdout.trim();
  }
  throw new Error("Chrome/Chromium binary not found");
}

async function waitFor(check, message, timeoutMs = 30_000, intervalMs = 150) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`${message}${lastError instanceof Error ? `: ${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
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
      const timer = setTimeout(() => reject(new Error("CDP websocket connection timed out")), 10_000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("CDP websocket connection failed")); }, { once: true });
    });
    return new CdpClient(socket);
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP command timed out: ${method}`)); }, 25_000);
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
  "--disable-background-networking", "--disable-default-apps", "--disable-extensions",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${path.join(artifactsDir, "chrome-profile")}`,
  "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });

let client;
let currentStep = "bootstrap";

async function ready() {
  await waitFor(() => client.evaluate("document.readyState === 'complete' && Boolean(document.body)"), "document did not become ready");
}
async function navigate(url) { await client.send("Page.navigate", { url }); await ready(); }
async function currentUrl() { return String(await client.evaluate("location.href")); }
async function waitUrl(fragment) { await waitFor(async () => (await currentUrl()).includes(fragment), `URL did not include ${fragment}`); await ready(); }
async function textIncludes(text) { return client.evaluate(`document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`); }
async function waitText(text) { await waitFor(() => textIncludes(text), `text not found: ${text}`); }
async function fill(selector, value) {
  const changed = await client.evaluate(`(() => { const element=document.querySelector(${JSON.stringify(selector)}); if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false; const descriptor=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element),'value'); descriptor?.set?.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true})); element.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  assert.equal(changed, true, `field not found: ${selector}`);
}
async function clickText(text) {
  const clicked = await client.evaluate(`(() => { const target=[...document.querySelectorAll('button,a')].find((element)=>element.textContent?.trim()===${JSON.stringify(text)}); if (!target) return false; target.click(); return true; })()`);
  assert.equal(clicked, true, `click target not found: ${text}`);
}
async function loginParticipant() {
  await navigate(`${baseUrl}/entrar`);
  await waitText("Entrar como participante");
  await fill('input[name="email"]', participantEmail);
  await fill('input[name="password"]', participantPassword);
  await clickText("Entrar");
  await waitUrl("/empreendedor");
}
async function logout() {
  await clickText("Sair");
  await waitUrl("/entrar");
}
async function captureFailure(error) {
  const diagnostics = {
    step: currentStep,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    url: client ? await currentUrl().catch(() => null) : null,
    body: client ? await client.evaluate("document.body?.innerText ?? ''").catch(() => null) : null,
  };
  await writeFile(path.join(artifactsDir, "failure.json"), JSON.stringify(diagnostics, null, 2), "utf8");
  if (client) {
    const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).catch(() => null);
    if (shot?.data) await writeFile(path.join(artifactsDir, "failure.png"), Buffer.from(shot.data, "base64"));
  }
}

try {
  const live = await fetch(`${baseUrl}/api/health/live`);
  assert.equal(live.status, 200, "liveness must be healthy");
  const readyResponse = await fetch(`${baseUrl}/api/health/ready`);
  assert.equal(readyResponse.status, 200, "readiness must be healthy for real E2E");

  await waitFor(async () => (await fetch(`http://127.0.0.1:${debuggingPort}/json/version`).catch(() => null))?.ok, "Chrome debugging endpoint did not become ready");
  const target = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, { method: "PUT" })).json();
  client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([client.send("Page.enable"), client.send("Runtime.enable"), client.send("DOM.enable"), client.send("Network.enable")]);

  currentStep = "participant authentication and dashboard";
  await loginParticipant();
  await waitText("Continue de onde parou");
  await waitText("Ranking de pontos");
  assert.equal(await textIncludes("Recompensas"), true);

  currentStep = "participant profile, library and journey";
  await clickText("Perfil");
  await waitUrl("/empreendedor/perfil");
  await waitText("Histórico de pontuação");
  await clickText("Biblioteca");
  await waitUrl("/capacitacao/biblioteca");
  await waitText("Biblioteca de conteúdos");
  await navigate(`${baseUrl}/empreendedor`);
  const journeyLink = await client.evaluate(`(() => { const links=[...document.querySelectorAll('a')]; const link=links.find((item)=>/Continuar|Começar jornada|Abrir jornada/.test(item.textContent??'')); if (!link) return null; link.click(); return link.getAttribute('href'); })()`);
  if (journeyLink) {
    await waitFor(async () => (await currentUrl()).includes("/empreendedor/"), "participant journey did not open");
    assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true);
  }
  await logout();

  currentStep = "Google administrative entry and authenticated session";
  await navigate(`${baseUrl}/entrar/administracao`);
  await waitText("Continuar com Google");
  await client.send("Network.clearBrowserCookies");
  await client.send("Network.setCookies", { cookies: adminCookies });
  await navigate(`${baseUrl}/admin`);
  await waitUrl("/admin");
  await waitText("Jornadas e evidências");

  currentStep = "integral product administration";
  await clickText("Produto");
  await waitUrl("/admin/produto");
  await waitText("Jornadas, atividades e regras");
  await waitText("Inventário configurado");
  await clickText("Diagnóstico");
  await waitUrl("/admin/diagnostico");
  await waitText("Diagnóstico e arquétipos");
  await clickText("Gamificação");
  await waitUrl("/admin/gamificacao");
  await waitText("Pontos, selos e certificados");
  await clickText("Relatórios");
  await waitUrl("/admin/relatorios");
  await waitText("Relatórios da plataforma");
  await waitText("Participantes");
  await clickText("Usuários");
  await waitUrl("/admin/usuarios");
  await waitText("Usuários e acesso");
  await clickText("Biblioteca");
  await waitUrl("/admin/biblioteca");

  currentStep = "mobile branded layout";
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await navigate(`${baseUrl}/admin/produto`);
  await waitText("Jornadas, atividades e regras");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "mobile administration has horizontal overflow");
  assert.equal(await client.evaluate("getComputedStyle(document.body).fontFamily.toLowerCase().includes('poppins')"), true, "Poppins brand font is not active");
  assert.equal(await client.evaluate("Boolean(document.querySelector('img[src=\"/brand/estimulo-logo-horizontal-color.svg\"]'))"), true, "official local logo is not rendered");

  const result = {
    status: "passed",
    target: parsedBaseUrl.origin,
    mode: "real_authenticated_read_only",
    flows: ["health", "participant_login", "dashboard", "profile", "library", "journey", "admin_google_entry", "admin_google_session", "operation", "product", "diagnostic", "gamification", "reports", "users", "admin_library", "mobile_brand"],
  };
  await writeFile(path.join(artifactsDir, "result.json"), JSON.stringify(result, null, 2), "utf8");
  process.stdout.write("[verify-deployment] passed\n");
} catch (error) {
  await captureFailure(error);
  throw error;
} finally {
  client?.close();
  chrome.kill("SIGTERM");
}
