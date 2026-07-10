import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../..");
const outputDir = resolve(repositoryRoot, ".tmp/e14-hubspot-contracts");
const tsconfigPath = resolve(currentDir, "tsconfig.json");
const testPath = resolve(
  outputDir,
  "scripts/e14/hubspot-contracts/hubspot-contracts.test.mjs"
);

const compilerCandidates = [
  resolve(repositoryRoot, "node_modules/typescript/bin/tsc"),
  resolve(repositoryRoot, "apps/web/node_modules/typescript/bin/tsc")
];
const compilerPath = compilerCandidates.find((candidate) => existsSync(candidate));

if (!compilerPath) {
  throw new Error("TypeScript compiler was not found. Run npm install before this test.");
}

rmSync(outputDir, { recursive: true, force: true });

try {
  const compile = spawnSync(process.execPath, [compilerPath, "-p", tsconfigPath], {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (compile.status !== 0) {
    throw new Error(`HubSpot contract compilation failed with status ${compile.status ?? "unknown"}.`);
  }

  const test = spawnSync(process.execPath, ["--test", testPath], {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (test.status !== 0) {
    throw new Error(`HubSpot contract tests failed with status ${test.status ?? "unknown"}.`);
  }
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
