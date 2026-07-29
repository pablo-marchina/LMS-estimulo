import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import {
  loadRepositoryEnvironment,
  repositoryRoot,
} from "./load-root-env.mjs";

const webRoot = resolve(repositoryRoot, "apps/web");

const command = process.argv[2];
const allowedCommands = new Set(["dev", "build", "start"]);

if (!allowedCommands.has(command)) {
  process.stderr.write("WEB_RUNTIME_COMMAND_REQUIRED: expected dev, build, or start\n");
  process.exit(2);
}

loadRepositoryEnvironment();

function resolveNextBinary() {
  try {
    const requireFromWebWorkspace = createRequire(resolve(webRoot, "package.json"));
    const nextPackageJson = requireFromWebWorkspace.resolve("next/package.json");
    const nextBinary = resolve(dirname(nextPackageJson), "dist/bin/next");

    if (!existsSync(nextBinary)) {
      throw new Error(`Next.js executable not found at ${nextBinary}`);
    }

    return nextBinary;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      [
        "WEB_RUNTIME_DEPENDENCY_MISSING: Next.js is not installed for @estimulo/web.",
        "Run `npm ci` from the repository root and try again.",
        `Workspace: ${webRoot}`,
        `Details: ${details}`,
      ].join("\n") + "\n",
    );
    return null;
  }
}

const nextBinary = resolveNextBinary();
if (!nextBinary) process.exit(1);

const nextArguments = command === "build" ? ["build", "--webpack"] : [command];
const child = spawn(process.execPath, [nextBinary, ...nextArguments], {
  cwd: webRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: false,
});

child.on("error", (error) => {
  process.stderr.write(`WEB_RUNTIME_START_FAILED:${error.message}\n`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.stderr.write(`WEB_RUNTIME_TERMINATED:${signal}\n`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
