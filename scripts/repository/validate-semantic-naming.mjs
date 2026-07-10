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
const phaseNamedPath = /(^|\/)[Ee]\d{2}(?:[_-]|\/|$)/;
const uppercasePhaseIdentifier = /\bE\d{2}(?:-[A-Z0-9]+|_[A-Z0-9_]+)?\b/g;
const phaseScriptName = /(?:^|:)(?:e|E)\d{2}(?:[-_:]|$)/;

for (const absolute of walk(repositoryRoot)) {
  const relative = relativePath(absolute);
  if (!isImmutableHistory(relative) && phaseNamedPath.test(relative)) {
    violations.push(`${relative}: active path is named after a delivery phase`);
  }
}

const forbiddenPlan = path.join(repositoryRoot, 'docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md');
try {
  statSync(forbiddenPlan);
  violations.push('docs/implementation/E14_REBASELINE_EXECUTION_PLAN.md: action plan must not be versioned');
} catch {
  // Expected: the action plan is not part of the repository.
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
  if (/\bE\d{2}\b|(?:^|[\/:])e\d{2}(?:[-_/:]|$)/m.test(text)) {
    violations.push(`${relative}: workflow still contains a phase-based active identifier`);
  }
}

for (const absolute of walk(repositoryRoot)) {
  const relative = relativePath(absolute);
  if (relative === 'scripts/repository/validate-semantic-naming.mjs') continue;
  if (isImmutableHistory(relative) || isCompatibilityReference(relative)) continue;
  if (!/\.(?:js|jsx|mjs|mts|ts|tsx|json|ya?ml|md)$/.test(relative)) continue;
  let text;
  try {
    text = readFileSync(absolute, 'utf8');
  } catch {
    continue;
  }
  const matches = [...text.matchAll(uppercasePhaseIdentifier)].map((match) => match[0]);
  if (matches.length > 0) {
    violations.push(`${relative}: active phase identifiers remain (${[...new Set(matches)].join(', ')})`);
  }
}

if (violations.length > 0) {
  console.error('Semantic naming validation failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Semantic naming validation passed: active repository artifacts use durable semantic names.');
