import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [journeyPage, journeyGeneral, journeySave, certificatePolicyMigration] = await Promise.all([
  readFile("apps/web/app/admin/produto/page.tsx", "utf8"),
  readFile("apps/web/app/admin/produto/journey-general-section.tsx", "utf8"),
  readFile("apps/web/lib/admin/journey-save.ts", "utf8"),
  readFile("supabase/migrations/20260817031500_journey_completion_certificate_selection.sql", "utf8"),
]);

test("journey editor exposes an explicit completion-certificate policy", () => {
  assert.match(journeyPage, /JourneyGeneralSection/u);
  assert.match(journeyGeneral, /Conclusão e certificado/u);
  assert.match(journeyGeneral, /name="completion_certificate_enabled"/u);
  assert.match(journeyGeneral, /name="completion_certificate_version_id"/u);
  assert.match(journeyGeneral, /Emitir certificado ao concluir a jornada/u);
  assert.match(journeyGeneral, /Somente certificados publicados e já vinculados a esta jornada aparecem aqui/u);
});

test("journey save validates and persists exactly the selected published certificate", () => {
  assert.match(journeySave, /completionCertificateEnabled/u);
  assert.match(journeySave, /completionCertificateVersionId/u);
  assert.match(journeySave, /COMPLETION_CERTIFICATE_REQUIRED/u);
  assert.match(journeySave, /COMPLETION_CERTIFICATE_NOT_AVAILABLE_FOR_JOURNEY/u);
  assert.match(journeySave, /version\.status === "published"/u);
  assert.match(journeySave, /String\(version\.journey_version_id \?\? ""\) === journeyId/u);
  assert.match(journeySave, /completion_certificate: completionCertificate/u);
  assert.match(journeySave, /trigger_event: "journey\.instance\.completed"/u);
});

test("credential runtime only considers the certificate selected by the journey", () => {
  assert.match(certificatePolicyMigration, /v_selected_certificate_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.id = v_selected_certificate_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.journey_version_id = v_journey_version_id/u);
  assert.match(certificatePolicyMigration, /cv\.status = 'published'/u);
  assert.match(certificatePolicyMigration, /cd\.status = 'active'/u);
});
