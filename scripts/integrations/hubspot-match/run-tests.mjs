import { existsSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../..");
const outputDir = resolve(repositoryRoot, ".tmp/hubspot-match");
const compiledTestDir = resolve(outputDir, "scripts/integrations/hubspot-match");
const tsconfigPath = resolve(currentDir, "tsconfig.json");

const compilerCandidates = [
  resolve(repositoryRoot, "node_modules/typescript/bin/tsc"),
  resolve(repositoryRoot, "apps/web/node_modules/typescript/bin/tsc")
];
const compilerPath = compilerCandidates.find((candidate) => existsSync(candidate));

if (!compilerPath) {
  throw new Error("TypeScript compiler was not found. Run npm ci before this test.");
}

rmSync(outputDir, { recursive: true, force: true });

try {
  const compile = spawnSync(process.execPath, [compilerPath, "-p", tsconfigPath], {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (compile.status !== 0) {
    throw new Error(`hubspot-match compilation failed with status ${compile.status ?? "unknown"}.`);
  }

  const testPaths = readdirSync(compiledTestDir)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => resolve(compiledTestDir, name));
  if (testPaths.length < 1) throw new Error("No compiled hubspot-match tests were found.");

  const test = spawnSync(process.execPath, ["--test", ...testPaths], {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (test.status !== 0) {
    throw new Error(`hubspot-match tests failed with status ${test.status ?? "unknown"}.`);
  }
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
