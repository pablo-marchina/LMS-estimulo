import assert from "node:assert/strict";
import test from "node:test";
import {
  collectIndexTargets,
  isApprovedEnvironmentFile,
  isCanonicalDocumentName,
  isGeneratedEvidence,
} from "./hygiene-policy.mjs";

test("repository hygiene policy classifies generated evidence without relying on validator source text", () => {
  assert.equal(isGeneratedEvidence("tmp/build-output.txt"), true);
  assert.equal(isGeneratedEvidence("docs/ARCHITECTURE.md"), false);
});

test("repository hygiene policy accepts only canonical documentation names", () => {
  assert.equal(isCanonicalDocumentName("docs/implementation/APPLICATION_FOUNDATION.md"), true);
  assert.equal(isCanonicalDocumentName("docs/decisions/ADR-004-RUNTIME-PROVIDER.md"), true);
  assert.equal(isCanonicalDocumentName("docs/implementation/application-foundation.md"), false);
});

test("repository hygiene policy keeps environment examples explicit", () => {
  assert.equal(isApprovedEnvironmentFile(".env.example"), true);
  assert.equal(isApprovedEnvironmentFile("config/supabase-test/.env.example"), true);
  assert.equal(isApprovedEnvironmentFile("apps/web/.env.local"), false);
});

test("repository hygiene policy extracts canonical index targets from markdown links", () => {
  const targets = collectIndexTargets(
    "[Foundation](docs/implementation/APPLICATION_FOUNDATION.md#runtime)\n" +
      "[External](https://example.com)\n" +
      "[Anchor](#local)",
  );

  assert.deepEqual(
    [...targets],
    ["docs/implementation/APPLICATION_FOUNDATION.md"],
  );
});
