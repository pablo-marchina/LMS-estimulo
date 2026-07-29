import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  loadRepositoryEnvironment,
  repositoryRoot,
} from "./load-root-env.mjs";

const webRoot = resolve(repositoryRoot, "apps/web");
const nextBinary = resolve(repositoryRoot, "node_modules/next/dist/bin/next");

const command = process.argv[2];
const allowedCommands = new Set(["dev", "build", "start"]);

if (!allowedCommands.has(command)) {
  process.stderr.write("WEB_RUNTIME_COMMAND_REQUIRED: expected dev, build, or start\n");
  process.exit(2);
}

loadRepositoryEnvironment();

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
