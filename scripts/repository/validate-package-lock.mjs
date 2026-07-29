import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const repositoryRoot = process.cwd();
const expectedPackageManager = "npm@10.9.8";
const expectedNodeVersion = "22.23.1";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"));
}

function fail(message) {
  console.error(`dependency-lock validation failed: ${message}`);
  process.exitCode = 1;
}

function normalizedEntries(value = {}) {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
}

function equalRecord(left, right) {
  return JSON.stringify(normalizedEntries(left)) === JSON.stringify(normalizedEntries(right));
}

const rootManifest = readJson("package.json");
const webManifest = readJson("apps/web/package.json");
const lockfile = readJson("package-lock.json");
const nodeVersion = readFileSync(resolve(repositoryRoot, ".node-version"), "utf8").trim();
const nvmVersion = readFileSync(resolve(repositoryRoot, ".nvmrc"), "utf8").trim();

if (rootManifest.packageManager !== expectedPackageManager) {
  fail(`packageManager must be ${expectedPackageManager}, received ${String(rootManifest.packageManager)}`);
}
if (nodeVersion !== expectedNodeVersion || nvmVersion !== expectedNodeVersion) {
  fail(`Node toolchain files must both be ${expectedNodeVersion}`);
}

if (lockfile.lockfileVersion !== 3) {
  fail(`lockfileVersion must be 3, received ${String(lockfile.lockfileVersion)}`);
}

const rootLock = lockfile.packages?.[""];
const webLock = lockfile.packages?.["apps/web"];

if (!rootLock) fail("root package entry is missing");
if (!webLock) fail("apps/web workspace entry is missing");

if (rootLock) {
  if (rootLock.name !== rootManifest.name) fail("root package name differs from package.json");
  if (JSON.stringify(rootLock.workspaces) !== JSON.stringify(rootManifest.workspaces)) {
    fail("workspace configuration differs from package.json");
  }
  if (JSON.stringify(rootLock.engines) !== JSON.stringify(rootManifest.engines)) {
    fail("root engines differ from package.json");
  }
}

if (webLock) {
  if (webLock.name !== webManifest.name || webLock.version !== webManifest.version) {
    fail("apps/web identity differs from its manifest");
  }
  if (!equalRecord(webLock.dependencies, webManifest.dependencies)) {
    fail("apps/web dependencies differ from its manifest");
  }
  if (!equalRecord(webLock.devDependencies, webManifest.devDependencies)) {
    fail("apps/web devDependencies differ from its manifest");
  }
}

for (const [packagePath, entry] of Object.entries(lockfile.packages ?? {})) {
  if (typeof entry?.resolved === "string" && /^https?:\/\//u.test(entry.resolved)) {
    fail(`${packagePath} contains a registry-specific resolved URL`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("dependency-lock validation passed");
