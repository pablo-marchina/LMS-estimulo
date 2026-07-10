import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const ignoredDirectories = new Set(['.git', '.next', '.artifacts', 'node_modules']);
const textExtensions = new Set([
  '.md', '.json', '.yaml', '.yml', '.csv', '.sql', '.mjs', '.js', '.ts', '.tsx', '.py', '.ps1', '.toml', '.txt',
]);
const errors = [];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
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
    if (isGeneratedEvidence(file)) errors.push(`generated evidence tracked: ${file}`);
    if (file.includes('/runtime-split/')) errors.push(`duplicate runtime split tracked: ${file}`);
    if (file.startsWith('generated/')) errors.push(`unused generated source tracked: ${file}`);
    if (/\.local(?:\.|$)/i.test(file)) errors.push(`local artifact tracked: ${file}`);

    const basename = path.posix.basename(file);
    if (basename.startsWith('.env') && basename !== '.env.example') {
      errors.push(`environment file tracked: ${file}`);
    }

    if (file.startsWith('docs/') && file.endsWith('.md')) {
      const valid = /^(?:[A-Z0-9]+(?:_[A-Z0-9]+)*|ADR-[0-9]{3}-[A-Z0-9]+(?:-[A-Z0-9]+)*)\.md$/.test(basename);
      if (!valid) errors.push(`invalid canonical document name: ${file}`);
    }
  }
}

async function validateLocalLinks(file) {
  const absolute = path.join(root, file);
  const source = await readFile(absolute, 'utf8');
  const links = [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim());

  for (const raw of links) {
    if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) continue;
    const clean = decodeURI(raw.split('#', 1)[0].split('?', 1)[0]);
    if (!clean) continue;
    const target = path.resolve(path.dirname(absolute), clean);
    if (!(await exists(target))) errors.push(`broken local link in ${file}: ${raw}`);
  }
}

async function validateRequiredFiles() {
  for (const file of ['README.md', 'PROJECT_INDEX.md', 'CONTRIBUTING.md']) {
    if (!files.includes(file)) errors.push(`required root file missing: ${file}`);
  }

  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (packageJson.scripts?.['validate:repository'] !== 'node scripts/repository/validate-hygiene.mjs') {
    errors.push('package.json does not expose validate:repository');
  }

  const index = await readFile(path.join(root, 'PROJECT_INDEX.md'), 'utf8');
  if (index.includes('supabase/migrations/MIGRATION_MANIFEST.json')) {
    errors.push('PROJECT_INDEX.md references the wrong migration manifest path');
  }
  if (/#[0-9]+/.test(index)) errors.push('PROJECT_INDEX.md must not depend on transient issue or PR numbers');

  const blockers = await readFile(path.join(root, 'docs/implementation/DELIVERY_BLOCKERS.md'), 'utf8');
  if (/#[0-9]+/.test(blockers)) errors.push('DELIVERY_BLOCKERS.md must not depend on transient issue or PR numbers');
}

async function validateEdgeFunctionSources() {
  const functionsRoot = path.join(root, 'supabase/functions');
  if (!(await exists(functionsRoot))) return;

  for (const entry of await readdir(functionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const required of ['index.ts', 'deno.json']) {
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
      entries.push({ file, content: await readFile(path.join(root, file), 'utf8') });
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
  return file.startsWith('scripts/e14/runtime-source-recovery/') && file.endsWith('.test.mjs');
}

function collectIndexTargets(indexSource) {
  const targets = new Set();
  for (const match of indexSource.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw)) continue;
    const clean = decodeURI(raw.split('#', 1)[0].split('?', 1)[0]);
    if (clean) targets.add(path.posix.normalize(clean));
  }
  return targets;
}

await walk(root);
validatePaths();
await validateRequiredFiles();
await validateLocalLinks('README.md');
await validateLocalLinks('PROJECT_INDEX.md');
await validateEdgeFunctionSources();

const textEntries = await readTextFiles();
const indexSource = await readFile(path.join(root, 'PROJECT_INDEX.md'), 'utf8');
const indexTargets = collectIndexTargets(indexSource);

const unindexedMarkdown = files
  .filter((file) => file.startsWith('docs/') && file.endsWith('.md'))
  .filter((file) => !indexTargets.has(file))
  .sort();

const unreferencedDocumentationArtifacts = files
  .filter((file) => file.startsWith('docs/'))
  .filter((file) => ['.json', '.yaml', '.yml', '.csv', '.sql', '.txt'].includes(path.posix.extname(file)))
  .filter((file) => !referencedByAnotherFile(file, textEntries))
  .sort();

const unreferencedScripts = files
  .filter((file) => file.startsWith('scripts/'))
  .filter((file) => ['.mjs', '.js', '.py', '.ps1', '.sql'].includes(path.posix.extname(file)))
  .filter((file) => !isKnownGlobEntrypoint(file))
  .filter((file) => !referencedByAnotherFile(file, textEntries))
  .sort();

const result = {
  status: errors.length === 0 ? 'ok' : 'failed',
  files_scanned: files.length,
  markdown_files: files.filter((file) => file.endsWith('.md')).length,
  errors,
  candidates: {
    unindexed_markdown: unindexedMarkdown,
    unreferenced_documentation_artifacts: unreferencedDocumentationArtifacts,
    unreferenced_scripts: unreferencedScripts,
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;
