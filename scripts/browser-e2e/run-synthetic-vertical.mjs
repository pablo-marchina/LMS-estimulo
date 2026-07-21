import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BROWSER_E2E_BASE_URL || "http://127.0.0.1:3000";
const token = process.env.BROWSER_E2E_TOKEN;
const artifactsDir = path.resolve(root, process.env.BROWSER_E2E_ARTIFACTS_DIR || ".artifacts/browser-e2e");
const fixtureFile = path.resolve(root, "scripts/browser-e2e/fixtures/evidence.txt");
const debuggingPort = Number(process.env.BROWSER_E2E_CDP_PORT || 9222);
const syntheticArticleVersionId = "f1000000-0000-4000-8000-000000000001";

if (!token || token.length < 24) throw new Error("BROWSER_E2E_TOKEN is required");
await mkdir(artifactsDir, { recursive: true });

function log(message) {
  process.stdout.write(`[browser-e2e] ${message}\n`);
}

async function waitFor(check, message, timeoutMs = 20_000, intervalMs = 100) {
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
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
}

async function waitForServer() {
  await waitFor(async () => {
    const response = await fetch(`${baseUrl}/entrar`, { redirect: "manual" });
    return response.status < 500;
  }, "Next.js server did not become ready", 30_000, 250);
}

function findChrome() {
  for (const candidate of [process.env.CHROME_BIN, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean)) {
    const result = spawnSync("which", [candidate], { encoding: "utf8" });
    if (result.status === 0) return result.stdout.trim();
  }
  throw new Error("Chrome/Chromium binary not found");
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
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, 20_000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
    return result.result?.value;
  }

  close() {
    this.socket.close();
  }
}

const chrome = spawn(findChrome(), [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-extensions",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${path.join(artifactsDir, "chrome-profile")}`,
  "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });

let client;
let currentStep = "bootstrap";

async function captureFailure(error) {
  const diagnostics = {
    step: currentStep,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    url: client ? await client.evaluate("location.href").catch(() => null) : null,
    body: client ? await client.evaluate("document.body?.innerText ?? ''").catch(() => null) : null
  };
  await writeFile(path.join(artifactsDir, "failure.json"), JSON.stringify(diagnostics, null, 2), "utf8");
  if (client) {
    const shot = await client.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).catch(() => null);
    if (shot?.data) await writeFile(path.join(artifactsDir, "failure.png"), Buffer.from(shot.data, "base64"));
  }
}

async function ready() {
  await waitFor(async () => client.evaluate("document.readyState === 'complete' && Boolean(document.body)"), "document did not become ready");
}

async function navigate(url) {
  await client.send("Page.navigate", { url });
  await ready();
}

async function textIncludes(text) {
  return client.evaluate(`document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`);
}

async function waitText(text) {
  await waitFor(() => textIncludes(text), `text not found: ${text}`);
}

async function waitUrl(fragment) {
  await waitFor(async () => String(await client.evaluate("location.href")).includes(fragment), `URL did not include ${fragment}`);
  await ready();
}

async function clickText(text) {
  const clicked = await client.evaluate(`(() => {
    const normalized = ${JSON.stringify(text)};
    const elements = [...document.querySelectorAll('button, a')];
    const target = elements.find((element) => element.textContent?.trim() === normalized);
    if (!target) return false;
    target.click();
    return true;
  })()`);
  assert.equal(clicked, true, `click target not found: ${text}`);
}

async function fill(selector, value) {
  const changed = await client.evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    descriptor?.set?.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `field not found: ${selector}`);
}

async function choose(value) {
  const selected = await client.evaluate(`(() => {
    const radio = document.querySelector('input[type="radio"][value=${JSON.stringify(value)}]');
    if (!(radio instanceof HTMLInputElement)) return false;
    radio.click();
    return true;
  })()`);
  assert.equal(selected, true, `radio option not found: ${value}`);
}

try {
  await waitForServer();
  const invalid = await fetch(`${baseUrl}/api/e2e/session?token=invalid`, { redirect: "manual" });
  assert.equal(invalid.status, 403, "synthetic session must reject invalid token");

  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`).catch(() => null);
    return response?.ok;
  }, "Chrome debugging endpoint did not become ready", 20_000, 200);

  const targetResponse = await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, { method: "PUT" });
  const target = await targetResponse.json();
  client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("DOM.enable"),
    client.send("Network.enable")
  ]);

  currentStep = "technical login and complete dashboard";
  log(currentStep);
  await navigate(`${baseUrl}/api/e2e/session?token=${encodeURIComponent(token)}`);
  await waitUrl("/empreendedor");
  await waitText("Continue de onde parou");
  await waitText("Acontecendo agora");
  await waitText("Primeira conquista");
  await waitText("Ranking de pontos");
  assert.equal(await textIncludes("Jornada sintética OpenAI"), true);

  await client.evaluate("document.activeElement?.blur(); document.body.focus();");
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await client.evaluate("document.activeElement?.textContent?.trim()"), "Pular para o conteúdo");

  currentStep = "participant profile";
  log(currentStep);
  await clickText("Perfil");
  await waitUrl("/empreendedor/perfil");
  await waitText("Histórico de pontuação");
  await waitText("Resultado do diagnóstico");
  await navigate(`${baseUrl}/empreendedor`);
  await waitText("Continue de onde parou");

  currentStep = "content library catalog and access replay";
  log(currentStep);
  await clickText("Biblioteca");
  await waitUrl("/capacitacao/biblioteca");
  await waitText("Biblioteca de conteúdos");
  await waitText("2 conteúdos encontrados");
  await fill('input[name="q"]', "fluxo caixa");
  await clickText("Aplicar filtros");
  await waitUrl("q=fluxo+caixa");
  await waitText("1 conteúdo encontrado");
  await waitText("Fluxo de caixa prático");
  await clickText("Ver conteúdo");
  await waitUrl("/capacitacao/biblioteca/fluxo-de-caixa-pratico");
  await waitText("Comece registrando todas as entradas e saídas.");
  const accessReplay = await client.evaluate(`(async () => {
    const body = { libraryItemVersionId: ${JSON.stringify(syntheticArticleVersionId)}, idempotencyKey: 'browser-library-access-replay-v1' };
    const first = await fetch('/api/library/access', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((response) => response.json());
    const second = await fetch('/api/library/access', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((response) => response.json());
    return { first, second };
  })()`);
  assert.equal(accessReplay.first.recorded, true);
  assert.equal(accessReplay.first.replayed, false);
  assert.equal(accessReplay.second.replayed, true);
  await navigate(`${baseUrl}/empreendedor`);
  await waitText("Continue de onde parou");

  currentStep = "start journey";
  log(currentStep);
  await clickText("Começar jornada");
  await waitUrl("/empreendedor/diagnostico");
  await waitText("Diagnóstico inicial");

  currentStep = "complete diagnosis and choose available activity";
  log(currentStep);
  const diagnosticSelected = await client.evaluate(`(() => {
    const fields = [...document.querySelectorAll('fieldset')];
    for (const field of fields) {
      const radio = field.querySelector('input[type="radio"][value="o2"]');
      if (!(radio instanceof HTMLInputElement)) return false;
      radio.click();
    }
    return fields.length === 2;
  })()`);
  assert.equal(diagnosticSelected, true);
  await clickText("Concluir diagnóstico");
  await waitUrl("/empreendedor/jornada/");
  await waitText("Blocos e atividades");
  await waitText("Fundamentos");
  await waitText("Entradas, regras e validação humana");
  await clickText("Começar");
  await waitUrl("/empreendedor/atividade/");
  await waitText("Estruture uma solicitação para o ChatGPT");

  currentStep = "acknowledge activity";
  log(currentStep);
  assert.equal(await client.evaluate(`(() => {
    const boxes = [...document.querySelectorAll('input[type="checkbox"][name^="section_"]')];
    boxes.forEach((box) => box.click());
    return boxes.length === 4;
  })()`), true);
  await clickText("Registrar leitura");
  await waitText("Verifique o que aprendeu");
  assert.equal(await client.evaluate("document.querySelector('[aria-label=\"Conteúdo confirmado\"]')?.getAttribute('aria-valuenow')"), "100");

  currentStep = "idempotent comment";
  log(currentStep);
  const comment = "Comentário sintético enviado duas vezes com a mesma chave.";
  await fill("#activity-comment", comment);
  assert.equal(await client.evaluate(`(() => {
    const textarea = document.querySelector('#activity-comment');
    const form = textarea?.closest('form');
    if (!(form instanceof HTMLFormElement)) return false;
    form.requestSubmit();
    form.requestSubmit();
    return true;
  })()`), true);
  await waitUrl("comentario=criado");
  await waitText(comment);
  assert.equal(await client.evaluate(`document.body.innerText.split(${JSON.stringify(comment)}).length - 1`), 1, "duplicate comment rendered");

  currentStep = "practice upload";
  log(currentStep);
  const documentNode = await client.send("DOM.getDocument", { depth: -1, pierce: true });
  const inputNode = await client.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "#practice-file" });
  assert.ok(inputNode.nodeId, "practice file input not found");
  await client.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [fixtureFile] });
  await clickText("Enviar evidência");
  await waitUrl("pratica=enviada");
  await waitText("Arquivo recebido");
  await waitText("evidence.txt");
  await navigate(String(await client.evaluate("location.href")));
  await waitText("Verificação de segurança");

  currentStep = "failed assessment and retry";
  log(currentStep);
  await choose("a");
  await clickText("Enviar avaliação");
  await waitUrl("avaliacao=reprovada");
  await waitText("Revise e tente novamente");
  await choose("b");
  await clickText("Enviar avaliação");
  await waitUrl("/empreendedor/resultado");
  await waitText("Avaliação aprovada");
  await waitText("Certificado sintético de jornada");

  currentStep = "certificate verification and reload";
  log(currentStep);
  await clickText("Abrir certificado");
  await waitUrl("/credenciais/EST-SYNTHETIC0000000001");
  await waitText("✓ Certificado válido");
  await client.send("Page.reload", { ignoreCache: true });
  await ready();
  await waitText("Participante sintético");

  currentStep = "mobile viewport";
  log(currentStep);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844
  });
  await navigate(`${baseUrl}/empreendedor`);
  await waitText("Continue de onde parou");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "mobile dashboard has horizontal overflow");
  assert.equal(await textIncludes("Concluídas"), true);
  assert.equal(await textIncludes("Credenciais"), true);
  await navigate(`${baseUrl}/empreendedor/perfil`);
  await waitText("Histórico de pontuação");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "mobile profile has horizontal overflow");
  await navigate(`${baseUrl}/capacitacao/biblioteca`);
  await waitText("Biblioteca de conteúdos");
  assert.equal(await client.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "mobile library has horizontal overflow");

  const result = {
    status: "passed",
    flow: ["technical_login", "dashboard", "profile", "library", "diagnosis", "journey_outline", "activity", "comment", "upload", "assessment_retry", "credentials", "certificate"],
    assertions: {
      keyboard: true,
      mobile: true,
      reload: true,
      duplicate_submission: true,
      library_access_replay: true,
      announcements: true,
      rewards: true,
      ranking: true,
      expandable_blocks: true,
      available_activity_choice: true
    }
  };
  await writeFile(path.join(artifactsDir, "result.json"), JSON.stringify(result, null, 2), "utf8");
  log("synthetic browser vertical passed");
} catch (error) {
  await captureFailure(error);
  throw error;
} finally {
  client?.close();
  chrome.kill("SIGTERM");
}
