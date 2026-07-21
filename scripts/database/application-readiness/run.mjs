import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const file = path.join(root, "scripts/database/application-readiness/test-application-readiness.sql");
const result = spawnSync("psql", ["--dbname", databaseUrl, "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--file", file], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, PGOPTIONS: "-c client_min_messages=warning" },
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`application readiness test failed with status ${result.status}`);
