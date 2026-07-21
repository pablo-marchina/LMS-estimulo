import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [rootPackage, webPackage, rootExample, webExample, launcher, bootstrap] = await Promise.all([
  readFile("package.json", "utf8").then(JSON.parse),
  readFile("apps/web/package.json", "utf8").then(JSON.parse),
  readFile(".env.example", "utf8"),
  readFile("apps/web/.env.example", "utf8"),
  readFile("scripts/runtime/run-web.mjs", "utf8"),
  readFile("scripts/operations/bootstrap-role-manager.mjs", "utf8"),
]);

test("web runtime commands use the portable launcher", () => {
  for (const command of ["dev", "build", "start"]) {
    assert.equal(webPackage.scripts[command], `node ../../scripts/runtime/run-web.mjs ${command}`);
  }
  assert.doesNotMatch(JSON.stringify(webPackage.scripts), /--env-file/u);
  assert.match(launcher, /loadEnvFile\(envPath\)/u);
  assert.match(launcher, /cwd: webRoot/u);
});

test("operational bootstrap loads the root env inside the process", () => {
  assert.equal(rootPackage.scripts["bootstrap:role-manager"], "node scripts/operations/bootstrap-role-manager.mjs");
  assert.doesNotMatch(rootPackage.scripts["bootstrap:role-manager"], /--env-file/u);
  assert.match(bootstrap, /loadRepositoryEnvironment\(\)/u);
  assert.match(bootstrap, /loadEnvFile\(envPath\)/u);
});

test("environment examples remain synchronized and point to the repository root", () => {
  assert.equal(rootExample, webExample);
  assert.match(rootExample, /^# Copy to \.env at the repository root/mu);
  assert.doesNotMatch(rootExample, /apps\/web\/\.env\.local/u);
});
