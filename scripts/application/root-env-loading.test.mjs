import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [rootPackage, webPackage, rootExample, webExample] = await Promise.all([
  readFile("package.json", "utf8").then(JSON.parse),
  readFile("apps/web/package.json", "utf8").then(JSON.parse),
  readFile(".env.example", "utf8"),
  readFile("apps/web/.env.example", "utf8"),
]);

test("web runtime commands explicitly load the repository root env", () => {
  for (const command of ["dev", "build", "start"]) {
    assert.match(webPackage.scripts[command], /node --env-file-if-exists=\.\.\/\.\.\/\.env /u);
  }
});

test("operational bootstrap loads the same root env", () => {
  assert.match(rootPackage.scripts["bootstrap:role-manager"], /node --env-file-if-exists=\.env /u);
});

test("environment examples remain synchronized and point to the repository root", () => {
  assert.equal(rootExample, webExample);
  assert.match(rootExample, /^# Copy to \.env at the repository root/mu);
  assert.doesNotMatch(rootExample, /apps\/web\/\.env\.local/u);
});
