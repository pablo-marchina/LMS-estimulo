import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminProductErrorMessage,
  getAdminProductSuccessNotice,
} from "../../apps/web/lib/admin/product-page-messages.mjs";

test("admin product notices map lifecycle outcomes to user-visible behavior", () => {
  assert.deepEqual(getAdminProductSuccessNotice("jornada_publicada"), {
    title: "Jornada publicada",
    message: "A jornada já pode ser acessada pelos participantes.",
  });

  assert.deepEqual(getAdminProductSuccessNotice("unknown"), {
    title: "Rascunho salvo",
    message: "Continue a edição ou publique quando estiver pronto.",
  });
});

test("admin product notices distinguish partial theme synchronization failures", () => {
  assert.equal(
    getAdminProductErrorMessage("temas_nao_salvos"),
    "A jornada foi salva, mas não foi possível sincronizar os temas. Tente salvar novamente.",
  );

  assert.equal(
    getAdminProductErrorMessage("unknown"),
    "Revise os campos obrigatórios e tente novamente.",
  );
});
