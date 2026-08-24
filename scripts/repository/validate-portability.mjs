import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const manifestPath = path.join(repositoryRoot, "config/platform/portable-runtime.json");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

const failures = [];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const envExample = read(".env.example");
const packageJson = JSON.parse(read("package.json"));
const gitignore = read(".gitignore");
const nodeVersion = read(".node-version").trim();
const supabaseConfig = read("supabase/config.toml");

if (manifest.schemaVersion !== 1) {
  fail(`unsupported manifest schemaVersion: ${manifest.schemaVersion}`);
}

if (manifest.repository.buildFromRepositoryRoot !== true || manifest.vercel.rootDirectory !== ".") {
  fail("Vercel/repository contract must build from repository root");
}

if (packageJson.engines?.node !== manifest.vercel.nodeEngine) {
  fail(`package.json engines.node must equal ${manifest.vercel.nodeEngine}`);
}

const expectedMajor = Number(String(manifest.vercel.nodeEngine).match(/^([0-9]+)/u)?.[1]);
const actualMajor = Number(nodeVersion.split(".")[0]);
if (!Number.isInteger(expectedMajor) || actualMajor !== expectedMajor) {
  fail(`.node-version major (${actualMajor}) does not match ${manifest.vercel.nodeEngine}`);
}

const requiredEnv = manifest.environment.requiredForSupabaseRuntime ?? [];
for (const entry of requiredEnv) {
  const assignment = new RegExp(`^${entry.name}=`, "mu");
  if (!assignment.test(envExample)) {
    fail(`.env.example is missing ${entry.name}`);
  }
  if (entry.secret && entry.name.startsWith("NEXT_PUBLIC_")) {
    fail(`secret variable must not be public: ${entry.name}`);
  }
}

const bridgeMatch = envExample.match(/^ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN=(.*)$/mu);
if (!bridgeMatch || bridgeMatch[1].trim() !== "") {
  fail("ADMIN_LOCAL_OAUTH_BRIDGE_ORIGIN must be blank in .env.example");
}

for (const entry of manifest.supabase.storageBuckets ?? []) {
  const expected = `${entry.environment}=${entry.default}`;
  if (!envExample.split(/\r?\n/u).includes(expected)) {
    fail(`.env.example must declare portable bucket default ${expected}`);
  }
}

for (const requiredIgnore of [".vercel/", "supabase/.temp/", "supabase/.branches/"]) {
  if (!gitignore.split(/\r?\n/u).includes(requiredIgnore)) {
    fail(`.gitignore is missing ${requiredIgnore}`);
  }
}

if (/vercel\.app/iu.test(supabaseConfig)) {
  fail("supabase/config.toml must not contain a hosted Vercel origin");
}

const canonicalFunctionDirectory = path.join(repositoryRoot, "supabase/functions");
const actualFunctionSlugs = fs
  .readdirSync(canonicalFunctionDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."))
  .map((entry) => entry.name)
  .sort();
const manifestFunctionSlugs = (manifest.supabase.edgeFunctions ?? []).map((entry) => entry.slug).sort();

if (JSON.stringify(actualFunctionSlugs) !== JSON.stringify(manifestFunctionSlugs)) {
  fail(
    `Supabase Edge Function manifest mismatch; repository=${actualFunctionSlugs.join(",")} manifest=${manifestFunctionSlugs.join(",")}`,
  );
}

for (const entry of manifest.supabase.edgeFunctions ?? []) {
  const sourceDirectory = path.join(repositoryRoot, entry.source);
  if (!fs.existsSync(sourceDirectory) || !fs.statSync(sourceDirectory).isDirectory()) {
    fail(`missing Edge Function source directory: ${entry.source}`);
    continue;
  }
  if (!fs.existsSync(path.join(sourceDirectory, "index.ts"))) {
    fail(`Edge Function source is missing index.ts: ${entry.source}`);
  }
  if (typeof entry.verifyJwt !== "boolean") {
    fail(`Edge Function verifyJwt must be explicit: ${entry.slug}`);
  }
}

const portabilitySensitiveFiles = [
  ".env.example",
  "supabase/config.toml",
  "README.md",
  "docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md",
  ".github/workflows/production-authenticated-audit.yml",
  ".github/workflows/production-visual-capture.yml",
];

const forbiddenPatterns = [
  {
    label: "concrete Vercel deployment URL",
    pattern: /https:\/\/[a-z0-9][a-z0-9.-]*\.vercel\.app\b/giu,
  },
  {
    label: "concrete Supabase project URL",
    pattern: /https:\/\/[a-z0-9]{15,}\.supabase\.co\b/giu,
  },
  {
    label: "concrete Supabase database hostname",
    pattern: /\bdb\.[a-z0-9]{15,}\.supabase\.co\b/giu,
  },
  {
    label: "Vercel project/team identifier",
    pattern: /\b(?:prj|team)_[A-Za-z0-9]{8,}\b/gu,
  },
  {
    label: "Supabase publishable key",
    pattern: /\bsb_publishable_[A-Za-z0-9_-]{10,}\b/gu,
  },
  {
    label: "hard-coded GitHub repository URL",
    pattern: /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/gu,
  },
];

for (const relativePath of portabilitySensitiveFiles) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const rule of forbiddenPatterns) {
    const matches = [...content.matchAll(rule.pattern)];
    if (matches.length > 0) {
      fail(`${relativePath} contains ${rule.label}: ${matches[0][0]}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write("[portability] validation failed\n");
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  `[portability] contract valid: ${manifestFunctionSlugs.length} canonical Supabase Edge Functions; Node ${manifest.vercel.nodeEngine}; provider-bound deployment identifiers absent\n`,
);
