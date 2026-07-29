import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDirectory = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(runtimeDirectory, "../..");
export const repositoryEnvPath = resolve(repositoryRoot, ".env");

export function loadRepositoryEnvironment(envPath = repositoryEnvPath) {
  if (!existsSync(envPath)) return false;
  loadEnvFile(envPath);
  return true;
}
