import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const policyPath = path.join(root, "config/repository/module-boundaries.json");
const policy = JSON.parse(await readFile(policyPath, "utf8"));
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".mts"]);
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.relative(root, absolute).replaceAll("\\", "/"));
    }
  }
}

function importsFrom(source) {
  const imports = new Set();

  for (const match of source.matchAll(
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
  )) {
    imports.add(match[1]);
  }

  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
    imports.add(match[1]);
  }

  return [...imports];
}

function applies(rule, file) {
  if (Array.isArray(rule.sourceFiles) && rule.sourceFiles.includes(file)) {
    return true;
  }
  return typeof rule.sourcePrefix === "string" && file.startsWith(rule.sourcePrefix);
}

await walk(path.join(root, "apps/web"));

const violations = [];

for (const file of files) {
  const matchingRules = policy.rules.filter((rule) => applies(rule, file));
  if (matchingRules.length === 0) continue;

  const source = await readFile(path.join(root, file), "utf8");
  const imports = importsFrom(source);

  for (const rule of matchingRules) {
    for (const candidate of imports) {
      const forbidden = rule.forbiddenImports.find((prefix) =>
        candidate.startsWith(prefix),
      );
      if (!forbidden) continue;
      violations.push({
        rule: rule.name,
        file,
        import: candidate,
        forbidden_prefix: forbidden,
      });
    }
  }
}

const result = {
  status: violations.length === 0 ? "ok" : "failed",
  policy: "config/repository/module-boundaries.json",
  files_scanned: files.length,
  violations,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (violations.length > 0) process.exitCode = 1;
