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

for (const role of targetRoles) {
  for (const viewport of requiredViewports) {
    const captures = (manifest.captures ?? []).filter((item) => item.role === role && item.viewport === viewport);
    if (!captures.length) failures.push(`${role} ${viewport}: no visual capture produced`);
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
    const found = (manifest.captures ?? []).some((item) => {
      if (item.role !== role || item.viewport !== viewport) return false;
      try {
        const url = new URL(item.requestedUrl);
        return url.pathname === route;
      } catch {
        return false;
      }
    });
    if (!found) failures.push(`${role} ${viewport}: required route ${route} was not captured`);
  }
}

const report = {
  schemaVersion: 1,
  manifestSchemaVersion: manifest.schemaVersion,
  checkedAt: new Date().toISOString(),
  captures: manifest.captures?.length ?? 0,
  originalFailures: manifest.failures?.length ?? 0,
  originalWarnings: manifest.warnings?.length ?? 0,
  failures,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Strict visual gate passed across ${report.captures} captures with no target warnings.`);
}
