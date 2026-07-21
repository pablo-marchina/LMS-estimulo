import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const webRoot = resolve(repositoryRoot, "apps/web");
const envPath = resolve(repositoryRoot, ".env");
const nextBinary = resolve(repositoryRoot, "node_modules/next/dist/bin/next");

const command = process.argv[2];
const allowedCommands = new Set(["dev", "build", "start"]);

if (!allowedCommands.has(command)) {
  process.stderr.write("WEB_RUNTIME_COMMAND_REQUIRED: expected dev, build, or start\n");
  process.exit(2);
}

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

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
