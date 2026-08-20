import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const configPath = path.join(root, "config/module-boundaries.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const sourceExtensions = new Set(config.extensions ?? []);
const sourceRoot = path.join(root, "apps/web");
const files = [];
const violations = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
      continue;
    }
    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) continue;
    files.push(path.relative(root, absolute).replaceAll("\\", "/"));
  }
}

function collectImports(source) {
  const specifiers = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/gu,
    /\bimport\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\(\s*["']([^"']+)["']\s*\)/gu,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function resolveRepositoryImport(file, specifier) {
  if (specifier.startsWith("@/")) {
    return `apps/web/${specifier.slice(2)}`;
  }
  if (specifier.startsWith(".")) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  }
  return null;
}

function validateFile(file, source) {
  const imports = collectImports(source);
  for (const rule of config.rules ?? []) {
    if (!file.startsWith(rule.from)) continue;
    for (const specifier of imports) {
      const target = resolveRepositoryImport(file, specifier);
      if (!target) continue;
      for (const forbiddenTarget of rule.forbiddenTargets ?? []) {
        if (!target.startsWith(forbiddenTarget)) continue;
        violations.push({
          rule: rule.name,
          file,
          import: specifier,
          target,
        });
      }
    }
  }
}

await walk(sourceRoot);

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");
  validateFile(file, source);
}

const result = {
  status: violations.length === 0 ? "ok" : "failed",
  files_scanned: files.length,
  rules: (config.rules ?? []).length,
  violations,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (violations.length > 0) process.exitCode = 1;
