import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [rootPackage, webPackage, rootExample, launcher, loader, bootstrap] = await Promise.all([
  readFile("package.json", "utf8").then(JSON.parse),
  readFile("apps/web/package.json", "utf8").then(JSON.parse),
  readFile(".env.example", "utf8"),
  readFile("scripts/runtime/run-web.mjs", "utf8"),
  readFile("scripts/runtime/load-root-env.mjs", "utf8"),
  readFile("scripts/operations/bootstrap-role-manager.mjs", "utf8"),
]);

test("web runtime commands use the portable root-environment launcher", () => {
  for (const command of ["dev", "build", "start"]) {
    assert.equal(webPackage.scripts[command], `node ../../scripts/runtime/run-web.mjs ${command}`);
  }
  assert.doesNotMatch(JSON.stringify(webPackage.scripts), /--env-file/u);
  assert.match(launcher, /loadRepositoryEnvironment\(\)/u);
  assert.match(launcher, /cwd: webRoot/u);
  assert.match(loader, /loadEnvFile\(envPath\)/u);
});

test("operational bootstrap loads the root env inside the process", () => {
  assert.equal(rootPackage.scripts["bootstrap:role-manager"], "node scripts/operations/bootstrap-role-manager.mjs");
  assert.doesNotMatch(rootPackage.scripts["bootstrap:role-manager"], /--env-file/u);
  assert.match(bootstrap, /loadRepositoryEnvironment\(\)/u);
  assert.match(loader, /loadEnvFile\(envPath\)/u);
});

test("one environment example is maintained at the repository root", async () => {
  assert.match(rootExample, /^# Copy to \.env at the repository root/mu);
  assert.doesNotMatch(rootExample, /apps\/web\/\.env\.local/u);
  await assert.rejects(
    readFile("apps/web/.env.example", "utf8"),
    (error) => error?.code === "ENOENT",
  );
});
