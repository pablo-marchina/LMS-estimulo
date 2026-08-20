import path from "node:path";

export const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".artifacts",
  "node_modules",
]);

export const textExtensions = new Set([
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".csv",
  ".sql",
  ".mjs",
  ".js",
  ".ts",
  ".tsx",
  ".py",
  ".ps1",
  ".toml",
  ".txt",
]);

export const forbiddenPrefixes = [
  ".claude/",
  ".deployment-triggers/",
  ".github/hooks/",
  ".github/skills/",
  ".superpowers/",
  "apps/web/lib/browser-e2e/",
  "docs/superpowers/",
  "scripts/browser-e2e/",
];

export const forbiddenExactFiles = new Set([
  ".github/workflows/browser-e2e.yml",
  ".github/workflows/experience-validation.yml",
  "apps/web/.env.example",
  "apps/web/app/api/e2e/session/route.ts",
  "docs/decisions/ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md",
  "docs/implementation/RUNTIME_GAP.md",
  "docs/implementation/SCHEMA_DELTA.md",
  "docs/product/SOURCE_AUTHORITY_HIERARCHY.md",
  "premissas-desenvolvimento.md",
]);

export const allowedEnvironmentExamples = new Set([
  ".env.example",
  "config/supabase-test/.env.example",
]);

export const forbiddenReferences = [
  "premissas-desenvolvimento.md",
  "SOURCE_AUTHORITY_HIERARCHY.md",
  "ADR-003-HUBSPOT-AUTHORITATIVE-DATA-SOURCE.md",
  "RUNTIME_GAP.md",
  "SCHEMA_DELTA.md",
  "BROWSER_E2E_MODE",
  "@/lib/browser-e2e/",
  "scripts/browser-e2e/",
  "run-synthetic-vertical.mjs",
  "test:browser-e2e",
];

export const requiredFiles = [
  "README.md",
  "PROJECT_INDEX.md",
  "CONTRIBUTING.md",
  ".env.example",
  "docs/architecture/AWS_ARCHITECTURE_STATUS.md",
  "docs/implementation/APPLICATION_FOUNDATION.md",
  "docs/implementation/DELIVERY_BLOCKERS.md",
  "docs/operations/FINAL_RELEASE_RUNBOOK.md",
  "scripts/database/run-gates.mjs",
  "scripts/verification/verify-deployment.mjs",
  "config/repository/module-boundaries.json",
  "scripts/repository/validate-module-boundaries.mjs",
];

const generatedEvidencePatterns = [
  /(?:^|[-_])test-output\.txt$/i,
  /(?:^|[-_])build-output\.txt$/i,
  /(?:^|[-_])validation-output\.json$/i,
  /(?:^|[-_])live-validation\.json$/i,
  /(?:^|[-_])integrity-scan\.json$/i,
  /remote-migration-history(?:-[^.]+)?\.json$/i,
  /^supabase-api-smoke-report\.json$/i,
];

export function isGeneratedEvidence(file) {
  const name = path.posix.basename(file);
  return generatedEvidencePatterns.some((pattern) => pattern.test(name));
}

export function isCanonicalDocumentName(file) {
  const basename = path.posix.basename(file);
  return /^(?:[A-Z0-9]+(?:_[A-Z0-9]+)*|ADR-[0-9]{3}-[A-Z0-9]+(?:-[A-Z0-9]+)*)\.md$/.test(
    basename,
  );
}

export function isApprovedEnvironmentFile(file) {
  const basename = path.posix.basename(file);
  if (!basename.startsWith(".env")) return true;
  return allowedEnvironmentExamples.has(file);
}

export function isKnownGlobEntrypoint(file) {
  return (
    file.endsWith(".test.mjs") ||
    file.endsWith(".test.js") ||
    file.endsWith(".test.ts")
  );
}

export function collectIndexTargets(indexSource) {
  const targets = new Set();

  for (const match of indexSource.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith("#") || /^[a-z]+:/i.test(raw)) continue;

    const clean = decodeURI(raw.split("#", 1)[0].split("?", 1)[0]);
    if (clean) targets.add(path.posix.normalize(clean));
  }

  return targets;
}
