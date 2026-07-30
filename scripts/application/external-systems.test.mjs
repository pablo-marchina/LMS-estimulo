import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildInterviewAiUrl, externalSystems } from "../../apps/web/lib/external-systems/registry-core.mjs";

test("external system registry preserves exact owner-provided endpoints", () => {
  assert.equal(externalSystems.trainingPlatform.url, "https://meus-projetos.igor-vitor215821.workers.dev/");
  assert.equal(externalSystems.dataHub.url, "https://data-hub-estimulo.lovable.app/");
  assert.match(externalSystems.interviewAi.baseUrl, /^https:\/\/script\.google\.com\/a\/macros\/estimulo\.org\//u);
});

test("interview AI URL requires a bounded numeric external identifier", () => {
  const url = new URL(buildInterviewAiUrl("2704890"));
  assert.equal(url.searchParams.get("id"), "2704890");
  assert.throws(() => buildInterviewAiUrl("deal:2704890"), /INTERVIEW_AI_EXTERNAL_ID_INVALID/u);
  assert.throws(() => buildInterviewAiUrl("1".repeat(21)), /INTERVIEW_AI_EXTERNAL_ID_INVALID/u);
});

test("the obsolete integrations page exposes no parallel external-system administration", async () => {
  const page = await readFile("apps/web/app/admin/integracoes/page.tsx", "utf8");
  assert.match(page, /redirect\("\/admin"\)/u);
  assert.doesNotMatch(page, /fetch\(|invokeServerRpc|createPrivilegedClient|HUBSPOT_PRIVATE_APP_TOKEN/u);
});
