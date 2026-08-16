import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [dashboard, blocks] = await Promise.all([
  readFile("apps/web/components/diagnostic-result-dashboard.tsx", "utf8"),
  readFile("apps/web/lib/diagnostics/result-blocks.ts", "utf8"),
]);

test("profile result no longer presents an aggregate score", () => {
  assert.doesNotMatch(dashboard, /const score =/u);
  assert.doesNotMatch(dashboard, />\/100</u);
  assert.match(dashboard, /Seu perfil empreendedor/u);
  assert.match(dashboard, /dimension\.percentage/u);
});

test("explicitly disabled diagnostic blocks are not restored by normalization", () => {
  assert.match(blocks, /if \(!Array\.isArray\(value\)\) return \[\.\.\.defaultDiagnosticResultBlocks\]/u);
  assert.doesNotMatch(blocks, /normalized\.length \? Array\.from/u);
  assert.match(blocks, /An explicit array, including \[\], is authoritative/u);
});
