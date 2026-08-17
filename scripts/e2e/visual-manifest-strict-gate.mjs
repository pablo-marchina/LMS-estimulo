import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifestPath = path.resolve("artifacts/e2e-visual/visual-manifest.json");
const reportPath = path.resolve("artifacts/e2e-visual/strict-gate-report.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const targetRoles = new Set(["public", "participant", "admin"]);
const requiredViewports = new Set(["wide", "desktop", "mobile"]);
const failures = [];

if ((manifest.failures?.length ?? 0) > 0) {
  failures.push(`broad visual crawler already reported ${manifest.failures.length} failure(s)`);
}

for (const warning of manifest.warnings ?? []) {
  const value = String(warning);
  if (/^(public|participant|admin)\b/u.test(value)) {
    failures.push(`target visual warning is release-blocking: ${value}`);
  }
}

function captureStayedOnTarget(item) {
  try {
    const requested = new URL(item.requestedUrl);
    const final = new URL(item.finalUrl);
    if (requested.origin === final.origin) return true;
    const protectionHint = final.hostname === "vercel.com" || final.hostname.endsWith(".vercel.com")
      ? "deployment protection redirected the browser"
      : "browser escaped the target origin";
    failures.push(`${item.role} ${item.viewport} ${item.requestedUrl}: ${protectionHint} to ${final.origin}${final.pathname}`);
    return false;
  } catch {
    failures.push(`${item.role} ${item.viewport} ${item.requestedUrl}: invalid requested/final URL in visual evidence`);
    return false;
  }
}

const validTargetCaptures = (manifest.captures ?? []).filter((item) => {
  if (!targetRoles.has(item.role)) return false;
  return captureStayedOnTarget(item);
});

for (const role of targetRoles) {
  for (const viewport of requiredViewports) {
    const captures = validTargetCaptures.filter((item) => item.role === role && item.viewport === viewport);
    if (!captures.length) failures.push(`${role} ${viewport}: no same-origin visual capture produced`);
  }
}

const requiredRoutes = [
  ["public", "/"],
  ["public", "/entrar"],
  ["public", "/cadastro"],
  ["participant", "/empreendedor"],
  ["participant", "/empreendedor/jornadas"],
  ["participant", "/empreendedor/recompensas"],
  ["admin", "/admin"],
  ["admin", "/admin/certificados"],
  ["admin", "/admin/gamificacao"],
  ["admin", "/admin/produto"],
];

for (const [role, route] of requiredRoutes) {
  for (const viewport of requiredViewports) {
    const found = validTargetCaptures.some((item) => {
      if (item.role !== role || item.viewport !== viewport) return false;
      try {
        const url = new URL(item.requestedUrl);
        return url.pathname === route;
      } catch {
        return false;
      }
    });
    if (!found) failures.push(`${role} ${viewport}: required same-origin route ${route} was not captured`);
  }
}

const report = {
  schemaVersion: 2,
  manifestSchemaVersion: manifest.schemaVersion,
  checkedAt: new Date().toISOString(),
  captures: manifest.captures?.length ?? 0,
  validTargetCaptures: validTargetCaptures.length,
  originalFailures: manifest.failures?.length ?? 0,
  originalWarnings: manifest.warnings?.length ?? 0,
  failures,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Strict visual gate passed across ${report.validTargetCaptures} same-origin target captures with no target warnings.`);
}
