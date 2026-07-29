import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const ignoredDirectories = new Set([".git", ".next", ".artifacts", "node_modules"]);
const textExtensions = new Set([
  ".md", ".json", ".yaml", ".yml", ".csv", ".sql", ".mjs", ".js", ".ts", ".tsx", ".py", ".ps1", ".toml", ".txt",
]);
const forbiddenPrefixes = [
  ".claude/",
  ".deployment-triggers/",
  ".github/hooks/",
  ".github/skills/",
  ".superpowers/",
  "apps/web/lib/browser-e2e/",
  "docs/superpowers/",
  "scripts/browser-e2e/",
];
const forbiddenExactFiles = new Set([
  ".github/workflows/browser-e2e.yml",
  ".github/workflows/experience-validation.yml",
  "apps/web/.env.example",
  "apps/web/app/api/e2e/session/route.ts",
  "docs/product/SOURCE_AUTHORITY_HIERARCHY.md",
  "premissas-desenvolvimento.md",
]);
const forbiddenReferences = [
  "premissas-desenvolvimento.md",
  "SOURCE_AUTHORITY_HIERARCHY.md",
  "BROWSER_E2E_MODE",
  "@/lib/browser-e2e/",
  "run-synthetic-vertical.mjs",
];
const requiredFiles = [
  "README.md",
  "PROJECT_INDEX.md",
  "CONTRIBUTING.md",
  ".env.example",
  "docs/implementation/APPLICATION_FOUNDATION.md",
  "docs/implementation/DELIVERY_BLOCKERS.md",
  "scripts/database/run-gates.mjs",
  "scripts/verification/verify-deployment.mjs",
];
const errors = [];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll("\\", "/"));
  }
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function isGeneratedEvidence(file) {
  const name = path.posix.basename(file);
  return [
    /(?:^|[-_])test-output\.txt$/i,
    /(?:^|[-_])build-output\.txt$/i,
    /(?:^|[-_])validation-output\.json$/i,
    /(?:^|[-_])live-validation\.json$/i,
    /(?:^|[-_])integrity-scan\.json$/i,
    /remote-migration-history(?:-[^.]+)?\.json$/i,
    /^supabase-api-smoke-report\.json$/i,
  ].some((pattern) => pattern.test(name));
}

function validatePaths() {
  for (const file of files) {
    if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
      errors.push(`development-only path tracked: ${file}`);
    }
    if (forbiddenExactFiles.has(file)) errors.push(`obsolete or development-only file tracked: ${file}`);
    if (/^scripts\/database\/[^/]+\/run\.mjs$/u.test(file)) {
      errors.push(`duplicate database wrapper tracked; use scripts/database/run-gates.mjs: ${file}`);
    }
    if (file.startsWith("scripts/application/") && /(?:regression|homolog|frente|round)/iu.test(path.posix.basename(file))) {
      errors.push(`process-bound application test name tracked: ${file}`);
    }
    if (file === ".tmp" || file.startsWith(".tmp/") || file.includes("/.tmp/")) {
      errors.push(`temporary runtime state tracked: ${file}`);
    }
    if (file === ".secrets" || file.startsWith(".secrets/") || file.includes("/.secrets/")) {
      errors.push(`secret material tracked: ${file}`);
    }
    if (file === "coverage" || file.startsWith("coverage/") || file.includes("/coverage/")) {
      errors.push(`coverage output tracked: ${file}`);
    }
    if (isGeneratedEvidence(file)) errors.push(`generated evidence tracked: ${file}`);
    if (file.includes("/runtime-split/")) errors.push(`duplicate runtime split tracked: ${file}`);
    if (file.startsWith("generated/")) errors.push(`unused generated source tracked: ${file}`);
    if (/\.local(?:\.|$)/i.test(file)) errors.push(`local artifact tracked: ${file}`);

    const basename = path.posix.basename(file);
    if (basename.startsWith(".env") && file !== ".env.example") {
      errors.push(`environment file tracked outside the canonical root example: ${file}`);
    }

    if (file.startsWith("docs/") && file.endsWith(".md")) {
      const valid = /^(?:[A-Z0-9]+(?:_[A-Z0-9]+)*|ADR-[0-9]{3}-[A-Z0-9]+(?:-[A-Z0-9]+)*)\.md$/.test(basename);
      if (!valid) errors.push(`invalid canonical document name: ${file}`);
    }
  }
}

async function validateLocalLinks(file) {
  const absolute = path.join(root, file);
  const source = await readFile(absolute, "utf8");
  const links = [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim());

  for (const raw of links) {
    if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw)) continue;
    const clean = decodeURI(raw.split("#", 1)[0].split("?", 1)[0]);
    if (!clean) continue;
    const target = path.resolve(path.dirname(absolute), clean);
    if (!(await exists(target))) errors.push(`broken local link in ${file}: ${raw}`);
  }
}

async function validateRequiredFiles() {
  for (const file of requiredFiles) {
    if (!files.includes(file)) errors.push(`required file missing: ${file}`);
  }

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const expectedScripts = {
    "validate:repository": "node scripts/repository/validate-hygiene.mjs",
    "test:application": "node --test scripts/application/*.test.mjs",
    "test:database": "node scripts/database/run-gates.mjs",
    "verify:deployment": "node scripts/verification/verify-deployment.mjs",
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    if (packageJson.scripts?.[name] !== command) errors.push(`package.json must expose ${name} as ${command}`);
  }

  const webPackageJson = JSON.parse(await readFile(path.join(root, "apps/web/package.json"), "utf8"));
  if (webPackageJson.scripts?.prebuild !== "node ../../scripts/runtime/validate-production-config.mjs") {
    errors.push("apps/web prebuild must only validate production configuration");
  }

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  if (readme.includes("apps/web/.env.local")) errors.push("README.md references obsolete workspace env location");

  const index = await readFile(path.join(root, "PROJECT_INDEX.md"), "utf8");
  if (/#[0-9]+/.test(index)) errors.push("PROJECT_INDEX.md must not depend on transient issue or PR numbers");

  const blockers = await readFile(path.join(root, "docs/implementation/DELIVERY_BLOCKERS.md"), "utf8");
  if (/#[0-9]+/.test(blockers)) errors.push("DELIVERY_BLOCKERS.md must not depend on transient issue or PR numbers");
  if (/total_migration_count|active_migration_count|recovered_migration_count/.test(blockers)) {
    errors.push("DELIVERY_BLOCKERS.md must not maintain migration counts manually");
  }
}

async function validateEdgeFunctionSources() {
  const functionsRoot = path.join(root, "supabase/functions");
  if (!(await exists(functionsRoot))) return;

  for (const entry of await readdir(functionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const required of ["index.ts", "deno.json"]) {
      const target = path.join(functionsRoot, entry.name, required);
      if (!(await exists(target))) errors.push(`incomplete edge function source: ${path.relative(root, target)}`);
    }
  }
}

async function readTextFiles() {
  const entries = [];
  for (const file of files) {
    if (!textExtensions.has(path.posix.extname(file))) continue;
    try {
      entries.push({ file, content: await readFile(path.join(root, file), "utf8") });
    } catch {
      // Binary or non-UTF-8 files are not candidates for textual reference analysis.
    }
  }
  return entries;
}

function referencedByAnotherFile(candidate, entries) {
  const basename = path.posix.basename(candidate);
  return entries.some(({ file, content }) => {
    if (file === candidate) return false;
    return content.includes(candidate) || content.includes(basename);
  });
}

function isKnownGlobEntrypoint(file) {
  return file.endsWith(".test.mjs") || file.endsWith(".test.js") || file.endsWith(".test.ts");
}

function collectIndexTargets(indexSource) {
  const targets = new Set();
  for (const match of indexSource.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw)) continue;
    const clean = decodeURI(raw.split("#", 1)[0].split("?", 1)[0]);
    if (clean) targets.add(path.posix.normalize(clean));
  }
  return targets;
}

await walk(root);
validatePaths();
await validateRequiredFiles();
await validateEdgeFunctionSources();

const markdownFiles = files.filter((file) => file.endsWith(".md"));
for (const file of markdownFiles) await validateLocalLinks(file);

const textEntries = await readTextFiles();
for (const { file, content } of textEntries) {
  for (const reference of forbiddenReferences) {
    if (content.includes(reference)) errors.push(`development-only reference in ${file}: ${reference}`);
  }
}

const indexSource = await readFile(path.join(root, "PROJECT_INDEX.md"), "utf8");
const indexTargets = collectIndexTargets(indexSource);
const unindexedMarkdown = files
  .filter((file) => file.startsWith("docs/") && file.endsWith(".md"))
  .filter((file) => !indexTargets.has(file))
  .sort();
for (const file of unindexedMarkdown) errors.push(`canonical document missing from PROJECT_INDEX.md: ${file}`);

const unreferencedDocumentationArtifacts = files
  .filter((file) => file.startsWith("docs/"))
  .filter((file) => [".json", ".yaml", ".yml", ".csv", ".sql", ".txt"].includes(path.posix.extname(file)))
  .filter((file) => !referencedByAnotherFile(file, textEntries))
  .sort();
for (const file of unreferencedDocumentationArtifacts) errors.push(`unreferenced documentation artifact: ${file}`);

const unreferencedScripts = files
  .filter((file) => file.startsWith("scripts/"))
  .filter((file) => [".mjs", ".js", ".py", ".ps1", ".sql"].includes(path.posix.extname(file)))
  .filter((file) => !isKnownGlobEntrypoint(file))
  .filter((file) => !referencedByAnotherFile(file, textEntries))
  .sort();
for (const file of unreferencedScripts) errors.push(`unreferenced script: ${file}`);

const result = {
  status: errors.length === 0 ? "ok" : "failed",
  files_scanned: files.length,
  markdown_files: markdownFiles.length,
  errors,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;
