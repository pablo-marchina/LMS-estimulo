import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const files = [
  "scripts/database/rbac-role-management/test-rbac-role-management.sql",
].map((file) => path.join(repositoryRoot, file));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required");

const args = ["--dbname", databaseUrl, "--no-psqlrc", "--set", "ON_ERROR_STOP=1"];
for (const file of files) args.push("--file", file);

const result = spawnSync("psql", args, {
  cwd: repositoryRoot,
  encoding: "utf8",
  env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
});

if (result.error) throw new Error(`failed to start psql: ${result.error.message}`);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  throw new Error(`RBAC role-management test failed with psql status ${result.status}`);
}
