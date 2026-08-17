import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [journeyPage, journeyAction, certificatePolicyMigration] = await Promise.all([
  readFile("apps/web/app/admin/produto/page.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/journey-action.ts", "utf8"),
  readFile("supabase/migrations/20260817031500_journey_completion_certificate_selection.sql", "utf8"),
]);

test("journey editor exposes an explicit completion-certificate policy", () => {
  assert.match(journeyPage, /Conclusão e certificado/u);
  assert.match(journeyPage, /name="completion_certificate_enabled"/u);
  assert.match(journeyPage, /name="completion_certificate_version_id"/u);
  assert.match(journeyPage, /Emitir certificado ao concluir a jornada/u);
  assert.match(journeyPage, /Somente certificados publicados e já vinculados a esta jornada aparecem aqui/u);
});

test("journey save validates and persists exactly the selected published certificate", () => {
  assert.match(journeyAction, /completionCertificateEnabled/u);
  assert.match(journeyAction, /completionCertificateVersionId/u);
  assert.match(journeyAction, /version\.status === "published"/u);
  assert.match(journeyAction, /String\(version\.journey_version_id \?\? ""\) === journeyId/u);
  assert.match(journeyAction, /completion_certificate: completionCertificate/u);
  assert.match(journeyAction, /trigger_event: "journey\.instance\.completed"/u);
});

test("credential runtime only considers the certificate selected by the journey", () => {
  assert.match(certificatePolicyMigration, /v_selected_certificate_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.id = v_selected_certificate_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.journey_version_id = v_journey_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.status = 'published'/u);
  assert.match(certificatePolicyMigration, /cd\.status = 'active'/u);
});
