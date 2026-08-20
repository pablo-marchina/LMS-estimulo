import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminProductStepHref,
  resolveAdminProductFeedback,
  resolveAdminProductStep,
  summarizeAdminProductTracks,
  versionStatus,
} from "../../apps/web/lib/admin/product-page-core.mjs";

test("admin product navigation normalizes legacy aliases and rejects unknown steps", () => {
  assert.equal(resolveAdminProductStep("geral"), "geral");
  assert.equal(resolveAdminProductStep("trilhas"), "conteudo");
  assert.equal(resolveAdminProductStep("aulas"), "conteudo");
  assert.equal(resolveAdminProductStep("publicar"), "publicacao");
  assert.equal(resolveAdminProductStep("qualquer-coisa"), "geral");
  assert.equal(resolveAdminProductStep(["publicacao", "geral"]), "publicacao");
});

test("admin product navigation builds canonical links and preserves the selected version", () => {
  assert.equal(buildAdminProductStepHref("trilhas", "abc-123"), "/admin/produto?etapa=conteudo&versao=abc-123");
  assert.equal(buildAdminProductStepHref("publicacao"), "/admin/produto?etapa=publicacao");
  assert.equal(buildAdminProductStepHref("unknown", "  "), "/admin/produto?etapa=geral");
});

test("admin product feedback maps lifecycle outcomes to user-facing messages", () => {
  const published = resolveAdminProductFeedback("jornada_publicada", undefined);
  assert.deepEqual(published, {
    success: "jornada_publicada",
    error: "",
    successTitle: "Jornada publicada",
    successMessage: "A jornada já pode ser acessada pelos participantes.",
    errorMessage: "Revise os campos obrigatórios e tente novamente.",
  });

  const invalidCertificate = resolveAdminProductFeedback(undefined, "certificado_conclusao_incompativel");
  assert.equal(invalidCertificate.errorMessage, "O certificado selecionado não está publicado ou não pertence a esta jornada.");
  assert.equal(invalidCertificate.successTitle, "Rascunho salvo");
});

test("admin product publication summary reflects the actual track graph", () => {
  assert.deepEqual(summarizeAdminProductTracks([]), {
    trackCount: 0,
    lessonCount: 0,
    emptyTrackCount: 0,
    graphLooksComplete: false,
  });

  assert.deepEqual(summarizeAdminProductTracks([
    { aulas: [{ id: "a" }, { id: "b" }] },
    { aulas: [] },
  ]), {
    trackCount: 2,
    lessonCount: 2,
    emptyTrackCount: 1,
    graphLooksComplete: false,
  });

  assert.equal(summarizeAdminProductTracks([
    { aulas: [{ id: "a" }] },
    { aulas: [{ id: "b" }] },
  ]).graphLooksComplete, true);
});

test("version status is localized without hiding unknown states", () => {
  assert.equal(versionStatus("draft"), "Rascunho");
  assert.equal(versionStatus("published"), "Publicada");
  assert.equal(versionStatus("retired"), "retired");
});
