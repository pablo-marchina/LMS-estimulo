import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const manifestPath = path.join(repositoryRoot, "config/platform/portable-runtime.json");
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
const fail = (message) => failures.push(message);
const sortedUnique = (values) => [...new Set(values)].sort();

function collectStaticContextReferences(content, contextName) {
  const references = [];
  const dotPattern = new RegExp(`\\b${contextName}\\.([A-Z0-9_]+)\\b`, "gu");
  const bracketPattern = new RegExp(`\\b${contextName}\\s*\\[\\s*[\"']([A-Z0-9_]+)[\"']\\s*\\]`, "gu");
  for (const match of content.matchAll(dotPattern)) references.push(match[1]);
  for (const match of content.matchAll(bracketPattern)) references.push(match[1]);
  return references;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const envExample = read(".env.example");
const packageJson = JSON.parse(read("package.json"));
const gitignore = read(".gitignore");
const nodeVersion = read(".node-version").trim();
const supabaseConfig = read("supabase/config.toml");

if (manifest.schemaVersion !== 1) fail(`unsupported manifest schemaVersion: ${manifest.schemaVersion}`);
if (manifest.repository.buildFromRepositoryRoot !== true || manifest.vercel.rootDirectory !== ".") fail("runtime must build from repository root");
if (packageJson.engines?.node !== manifest.vercel.nodeEngine) fail(`package.json engines.node must equal ${manifest.vercel.nodeEngine}`);
if (nodeVersion !== manifest.repository.ciNodeVersion) fail(`.node-version must equal ${manifest.repository.ciNodeVersion}`);

for (const entry of manifest.environment.requiredForSupabaseRuntime ?? []) {
  if (!new RegExp(`^${entry.name}=`, "mu").test(envExample)) fail(`.env.example is missing ${entry.name}`);
  if (entry.secret && entry.name.startsWith("NEXT_PUBLIC_")) fail(`secret variable must not be public: ${entry.name}`);
}
for (const entry of manifest.supabase.storageBuckets ?? []) {
  const expected = `${entry.environment}=${entry.default}`;
  if (!envExample.split(/\r?\n/u).includes(expected)) fail(`.env.example must declare ${expected}`);
}
for (const requiredIgnore of [".vercel/", "supabase/.temp/", "supabase/.branches/"]) {
  if (!gitignore.split(/\r?\n/u).includes(requiredIgnore)) fail(`.gitignore is missing ${requiredIgnore}`);
}
if (/https:\/\/[a-z0-9][a-z0-9.-]*\.vercel\.app\b/iu.test(supabaseConfig)) fail("supabase/config.toml must not contain a hosted Vercel origin");

const workflowsDirectory = path.join(repositoryRoot, ".github/workflows");
const workflowSources = fs.readdirSync(workflowsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name))
  .map((entry) => ({ name: entry.name, content: read(`.github/workflows/${entry.name}`) }));
const actionSecrets = sortedUnique(workflowSources.flatMap(({ content }) => collectStaticContextReferences(content, "secrets"))).filter((name) => name !== "GITHUB_TOKEN");
const actionVariables = sortedUnique(workflowSources.flatMap(({ content }) => collectStaticContextReferences(content, "vars")));
if (JSON.stringify(actionSecrets) !== JSON.stringify(sortedUnique(manifest.github.actionsRequiredSecrets ?? []))) fail(`GitHub Actions secret inventory mismatch: ${actionSecrets.join(",")}`);
if (JSON.stringify(actionVariables) !== JSON.stringify(sortedUnique(manifest.github.actionsRequiredVariables ?? []))) fail(`GitHub Actions variable inventory mismatch: ${actionVariables.join(",")}`);

const functionRoot = path.join(repositoryRoot, "supabase/functions");
const actualFunctions = fs.readdirSync(functionRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
const expectedFunctions = (manifest.supabase.edgeFunctions ?? []).map((entry) => entry.slug).sort();
if (JSON.stringify(actualFunctions) !== JSON.stringify(expectedFunctions)) fail(`Supabase Edge Function manifest mismatch: ${actualFunctions.join(",")}`);
for (const entry of manifest.supabase.edgeFunctions ?? []) {
  const directory = path.join(repositoryRoot, entry.source);
  if (!fs.existsSync(path.join(directory, "index.ts"))) fail(`Edge Function source is missing index.ts: ${entry.source}`);
  if (typeof entry.verifyJwt !== "boolean") fail(`Edge Function verifyJwt must be explicit: ${entry.slug}`);
}

for (const relativePath of [".env.example", "supabase/config.toml", "README.md", "docs/operations/DOMAIN_AND_AUTH_CONFIGURATION.md", "docs/operations/PORTABILITY.md"]) {
  if (!fs.existsSync(path.join(repositoryRoot, relativePath))) continue;
  const content = read(relativePath);
  for (const rule of [
    [/https:\/\/[a-z0-9][a-z0-9.-]*\.vercel\.app\b/giu, "concrete Vercel deployment URL"],
    [/https:\/\/[a-z0-9]{15,}\.supabase\.co\b/giu, "concrete Supabase project URL"],
    [/\b(?:prj|team)_[A-Za-z0-9]{8,}\b/gu, "provider project identifier"]
  ]) {
    if (rule[0].test(content)) fail(`${relativePath} contains ${rule[1]}`);
  }
}

if (failures.length > 0) {
  process.stderr.write("[portability] validation failed\n");
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}
process.stdout.write(`[portability] contract valid: ${expectedFunctions.length} Edge Functions; ${actionSecrets.length} GitHub Actions secrets; Node ${manifest.vercel.nodeEngine}\n`);
