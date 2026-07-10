import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const excludedDirectories = new Set(['.git', '.next', '.artifacts', 'node_modules']);
const immutableHistoryPrefixes = [
  'supabase/migrations/',
  'supabase/canonical-migrations/202',
];
const compatibilityFiles = new Set([
  'apps/web/lib/journey-runtime/rpc.ts',
  'apps/web/lib/journey-runtime/legacy-rpc-arguments.ts',
  'docs/implementation/opaque-helper-baseline-v1.json',
  'docs/implementation/public-rpc-contracts-v1.json',
]);
const compatibilityPrefixes = [
  'scripts/database/backend-e2e/',
  'scripts/database/equivalence/',
  'scripts/database/legacy-rpc/',
  'scripts/database/migration-history/',
  'scripts/database/public-rpc-contracts/',
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return statSync(absolute).isFile() ? [absolute] : [];
  });
}

function relativePath(absolute) {
  return path.relative(repositoryRoot, absolute).replaceAll('\\', '/');
}

function isImmutableHistory(relative) {
  return immutableHistoryPrefixes.some((prefix) => relative.startsWith(prefix));
}

function isCompatibilityReference(relative) {
  return compatibilityFiles.has(relative) || compatibilityPrefixes.some((prefix) => relative.startsWith(prefix));
}

const violations = [];
const phaseNamedPath = /(^|\/)[Ee]\d{2}(?:[._\/-]|$)/;
const phaseScriptName = /(?:^|:)(?:e|E)\d{2}(?:[-_:]|$)/;
const phaseHeading = /^(#{1,6})\s+.*\bE\d{2}(?:-[A-Z0-9]+|_[A-Z0-9_]+)?\b/m;
const phaseBlockerId = /\bE\d{2}-B\d+\b/;
const activeCodeIdentifier = /\b(?:legacy)?E\d{2}[A-Za-z_][A-Za-z0-9_]*\b|\b(?:const|let|var|class|function|interface|type)\s+e\d{2}\b|["']@\/(?:[^"']*\/)?e\d{2}\//;

for (const absolute of walk(repositoryRoot)) {
  const relative = relativePath(absolute);
  if (!isImmutableHistory(relative) && phaseNamedPath.test(relative)) {
    violations.push(`${relative}: active path is named after a delivery phase`);
  }
}

for (const relative of [
  'docs/implementation/action plan (not versioned)',
  'docs/implementation/ACTION_PLAN.md',
  'ACTION_PLAN.md',
]) {
  try {
    statSync(path.join(repositoryRoot, relative));
    violations.push(`${relative}: action plans must not be versioned in the repository`);
  } catch {
    // Expected: operational plans live outside the repository.
  }
}

const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
for (const scriptName of Object.keys(packageJson.scripts ?? {})) {
  if (phaseScriptName.test(scriptName)) {
    violations.push(`package.json: script ${scriptName} is named after a delivery phase`);
  }
}

for (const absolute of walk(path.join(repositoryRoot, '.github', 'workflows'))) {
  const relative = relativePath(absolute);
  const text = readFileSync(absolute, 'utf8');
  if (phaseNamedPath.test(relative) || /\bE\d{2}\b|(?:^|[\/:])e\d{2}(?:[-_/:]|$)/m.test(text)) {
    violations.push(`${relative}: workflow contains a phase-based active identity`);
  }
}

for (const absolute of walk(path.join(repositoryRoot, 'docs'))) {
  const relative = relativePath(absolute);
  if (!relative.endsWith('.md')) continue;
  const text = readFileSync(absolute, 'utf8');
  if (phaseHeading.test(text)) {
    violations.push(`${relative}: document heading is named after a delivery phase`);
  }
  if (phaseBlockerId.test(text)) {
    violations.push(`${relative}: blocker IDs must be semantic and durable`);
  }
  if (/E\d{2}_REBASELINE_EXECUTION_PLAN|E\d{2}-R\d+/.test(text)) {
    violations.push(`${relative}: active document references a phase-based plan identity`);
  }
}

for (const absolute of walk(repositoryRoot)) {
  const relative = relativePath(absolute);
  if (relative === 'scripts/repository/validate-semantic-naming.mjs') continue;
  if (isImmutableHistory(relative) || isCompatibilityReference(relative)) continue;
  if (!/\.(?:js|jsx|mjs|mts|ts|tsx)$/.test(relative)) continue;
  const text = readFileSync(absolute, 'utf8');
  if (activeCodeIdentifier.test(text)) {
    violations.push(`${relative}: active code symbol or import is named after a delivery phase`);
  }
}

if (violations.length > 0) {
  console.error('Semantic naming validation failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Semantic naming validation passed: active repository identities use durable semantic names.');
