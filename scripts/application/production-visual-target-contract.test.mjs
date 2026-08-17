import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(".github/workflows/production-visual-capture.yml", "utf8");

test("production visual audit targets the public canonical origin while preserving immutable deployment provenance", () => {
  assert.match(workflow, /github\.event\.deployment\.environment == 'Production'/u);
  assert.match(workflow, /https:\/\/lms-estimulo-web\.vercel\.app/u);
  assert.match(workflow, /E2E_SOURCE_DEPLOYMENT_URL/u);
  assert.match(workflow, /sourceDeploymentUrl/u);
});

test("visual audit uses the August prioritization Lovable reference", () => {
  assert.match(workflow, /https:\/\/estimulo-polish-studio\.lovable\.app\//u);
  assert.doesNotMatch(workflow, /estimulo-openai-boost\.lovable\.app/u);
});
